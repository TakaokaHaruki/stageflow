import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, MapPin, Clock, RefreshCw, LogOut, AlertCircle, Keyboard } from "lucide-react";
import CrewlyLogo from "@/components/CrewlyLogo";
import QRCodeUpload from "@/components/QRCodeUpload";

const STORAGE_KEY = "crewly_acast_id";

const TIME_SLOT_LABELS = {
  "開場中": { label: "開場中", color: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800 dark:text-blue-400" },
  "開演中": { label: "開演中", color: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800 dark:text-green-400" },
  "終演後": { label: "終演後", color: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800 dark:text-orange-400" },
};

const SLOT_ORDER = ["開場中", "開演中", "終演後"];

export default function StaffPortal() {
  const navigate = useNavigate();
  const [acastId, setAcastId] = useState("");
  const [inputId, setInputId] = useState("");
  const [staffName, setStaffName] = useState(null);
  const [positions, setPositions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrError, setQrError] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const clickCountRef = useRef(0);
  const resetTimerRef = useRef(null);

  // Restore saved ID on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setAcastId(saved);
      authenticate(saved);
    } else {
      setInitialized(true);
    }
  }, []);

  const authenticate = async (id) => {
    setLoading(true);
    setError("");
    try {
      // Find staff with this acast_id
      const allStaff = await base44.entities.Staff.filter({ acast_id: id });
      if (!allStaff || allStaff.length === 0) {
        setError("A キャスト ID が見つかりませんでした。");
        setLoading(false);
        setInitialized(true);
        return;
      }

      const staff = allStaff[0];
      setStaffName(staff.name);

      // Get active events (準備中 or 開催中)
      const allEvents = await base44.entities.Event.list("-date", 50);
      const activeEvents = allEvents.filter(
        (e) => e.status === "準備中" || e.status === "開催中"
      ).sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
      });

      setEvents(activeEvents);

      // Get positions for all active events where staff is assigned
      const allPositions = [];
      for (const event of activeEvents) {
        const eventPositions = await base44.entities.Position.filter({ event_id: event.id });
        const myPositions = eventPositions.filter((pos) => {
          const inMain = (pos.staff_names || []).includes(staff.name);
          const inKamite = (pos.staff_names_kamite || []).includes(staff.name);
          const inShimote = (pos.staff_names_shimote || []).includes(staff.name);
          return inMain || inKamite || inShimote;
        });
        for (const pos of myPositions) {
          allPositions.push({ ...pos, _eventName: event.name, _eventDate: event.date, _eventId: event.id });
        }
      }

      setPositions(allPositions);
      localStorage.setItem(STORAGE_KEY, id);
      setAcastId(id);
    } catch (e) {
      setError("データの取得に失敗しました。");
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputId.trim()) return;
    authenticate(inputId.trim());
  };

  const handleQRRead = async (qrData) => {
    setQrError("");
    const extractedId = qrData.trim();
    if (!extractedId) {
      setQrError("QR コードから ID を読み取れませんでした");
      return;
    }
    await authenticate(extractedId);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAcastId("");
    setStaffName(null);
    setPositions([]);
    setEvents([]);
    setInputId("");
    setError("");
  };

  const handleLogoClick = () => {
    clickCountRef.current += 1;
    if (clickCountRef.current === 5) {
      clickCountRef.current = 0;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      navigate("/home");
    } else {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 2000);
    }
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Login screen
  if (!staffName) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col items-center mb-8">
            <div onClick={handleLogoClick} className="cursor-pointer">
              <CrewlyLogo />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">スタッフポータル</p>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-lg p-6">
            <h1 className="text-base font-bold mb-1">スタッフログイン</h1>
            <p className="text-xs text-muted-foreground mb-4">A キャスト ID の QR コードをアップロード</p>
            
            <QRCodeUpload
              onQRRead={handleQRRead}
              loading={loading}
              error={qrError}
            />

            <AnimatePresence>
              {error && !qrError && (
                <motion.p
                  className="flex items-center gap-1.5 text-xs text-destructive justify-center mt-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mt-4">
              <button
                onClick={() => setShowTextInput(!showTextInput)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 mx-auto transition-colors"
              >
                <Keyboard className="w-3.5 h-3.5" />
                {showTextInput ? "QR コードでログイン" : "ID を直接入力する場合はこちら"}
              </button>
            </div>

            <AnimatePresence>
              {showTextInput && (
                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-3 mt-4 pt-4 border-t border-border"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Input
                    value={inputId}
                    onChange={(e) => setInputId(e.target.value)}
                    placeholder="例：AC-12345"
                    className="text-center text-base tracking-widest"
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="off"
                  />
                  <Button type="submit" className="w-full gap-2" disabled={!inputId.trim() || loading}>
                    {loading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" />確認中...</>
                    ) : (
                      <><LogIn className="w-4 h-4" />確認する</>
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>


        </motion.div>
      </div>
    );
  }

  // Positions view
  const groupedByEvent = events.map((event) => {
    const eventPositions = positions.filter((p) => p._eventId === event.id);
    const bySlot = {};
    for (const slot of SLOT_ORDER) {
      bySlot[slot] = eventPositions.filter((p) => p.time_slot === slot);
    }
    return { event, bySlot, total: eventPositions.length };
  }).filter((g) => g.total > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50 safe-area-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <CrewlyLogo />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs font-semibold leading-none">{staffName}</div>
              <div className="text-[10px] text-muted-foreground leading-none mt-0.5">スタッフ</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
              title="ログアウト"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 pb-12">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!loading && groupedByEvent.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">現在担当するポジションがありません</p>
            <p className="text-xs text-muted-foreground mt-1">開催中・準備中のイベントへの配置をご確認ください</p>
            <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => authenticate(acastId)}>
              <RefreshCw className="w-3.5 h-3.5" />再読み込み
            </Button>
          </motion.div>
        )}

        {!loading && groupedByEvent.map(({ event, bySlot }, idx) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="mb-6"
          >
            {/* Event header */}
            <div className="mb-3">
              <h2 className="font-bold text-base">{event.name}</h2>
              <div className="flex items-center gap-3 mt-0.5">
                {event.date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(event.date).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                  </span>
                )}
                {event.venue && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.venue}
                  </span>
                )}
              </div>
              {/* Event times */}
              {(event.time_open || event.time_start || event.time_end) && (
                <div className="flex flex-wrap gap-x-3 mt-1">
                  {event.time_priority && <span className="text-[11px] text-muted-foreground">先行 {event.time_priority}</span>}
                  {event.time_open && <span className="text-[11px] text-muted-foreground">開場 {event.time_open}</span>}
                  {event.time_start && <span className="text-[11px] text-muted-foreground">開演 {event.time_start}</span>}
                  {event.time_end && <span className="text-[11px] text-muted-foreground">終演 {event.time_end}</span>}
                </div>
              )}
            </div>

            {/* Positions by time slot */}
            <div className="space-y-2">
              {SLOT_ORDER.map((slot) => {
                const slotPositions = bySlot[slot];
                if (!slotPositions || slotPositions.length === 0) return null;
                const slotStyle = TIME_SLOT_LABELS[slot];
                return (
                  <div key={slot}>
                    <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border mb-1.5 ${slotStyle.color}`}>
                      {slotStyle.label}
                    </div>
                    <div className="space-y-1.5">
                      {slotPositions.map((pos) => (
                        <div
                          key={pos.id}
                          className="bg-card border border-border rounded-xl p-3.5"
                          style={pos.color ? { borderLeftColor: pos.color, borderLeftWidth: 3 } : {}}
                        >
                          <div className="font-semibold text-sm">{pos.name}</div>
                          {pos.notes && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{pos.notes}</p>
                          )}
                          {/* Side info */}
                          {pos.split_by_side && (
                            <div className="flex gap-2 mt-1.5">
                              {(pos.staff_names_kamite || []).includes(staffName) && (
                                <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">上手側</span>
                              )}
                              {(pos.staff_names_shimote || []).includes(staffName) && (
                                <span className="text-[11px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">下手側</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}

        {!loading && groupedByEvent.length > 0 && (
          <div className="text-center mt-4">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={() => authenticate(acastId)}>
              <RefreshCw className="w-3.5 h-3.5" />更新
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}