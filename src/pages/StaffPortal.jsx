import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, MapPin, Clock, RefreshCw, LogOut, AlertCircle, Keyboard, QrCode, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import CrewlyLogo from "@/components/CrewlyLogo";
import QRCodeUpload from "@/components/QRCodeUpload";
import QrCameraScanner from "@/components/QrCameraScanner";
import StaffConfirmationModal from "@/components/StaffConfirmationModal";
import ComplianceAgreementModal from "@/components/ComplianceAgreementModal";
import EventTimeDisplay from "@/components/EventTimeDisplay";
import PortalMaintenance from "@/components/PortalMaintenance";
import ConfirmDialog from "@/components/ConfirmDialog";

const STORAGE_KEY = "crewly_acast_id";
const COMPLIANCE_STORAGE_PREFIX = "crewly_compliance_";

const TIME_SLOT_LABELS = {
  "通し": { label: "通し", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400" },
  "開場中": { label: "開場中", color: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800 dark:text-blue-400" },
  "開演中": { label: "開演中", color: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800 dark:text-green-400" },
  "終演後": { label: "終演後", color: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800 dark:text-orange-400" },
};

const SLOT_ORDER = ["通し", "開場中", "開演中", "終演後"];

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
  const [pendingAuthData, setPendingAuthData] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [portalDisabled, setPortalDisabled] = useState(false);
  const [qrScanPosition, setQrScanPosition] = useState(null);
  const [qrProcessing, setQrProcessing] = useState(false);
  const [staffRoles, setStaffRoles] = useState([]);
  const [pendingRemove, setPendingRemove] = useState(null); // {staffName, position}
  const [removing, setRemoving] = useState(false);
  const clickCountRef = useRef(0);
  const resetTimerRef = useRef(null);

  // Check portal restriction and restore saved ID on mount
  useEffect(() => {
    (async () => {
      try {
        const configs = await base44.entities.AppConfig.filter({ key: "portal_login_disabled" });
        if (configs?.[0]?.value_bool === true) {
          setPortalDisabled(true);
          setInitialized(true);
          return;
        }
      } catch (_) {}
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setAcastId(saved);
        authenticate(saved);
      } else {
        setInitialized(true);
      }
    })();
  }, []);

  const authenticate = async (id) => {
    setLoading(true);
    setError("");
    try {
      // Find staff with this acast_id
      const allStaff = await base44.entities.Staff.filter({ acast_id: id });
      if (!allStaff || allStaff.length === 0) {
        setError("A-CAST ID が見つかりませんでした。");
        setLoading(false);
        setInitialized(true);
        return;
      }

      const staff = allStaff[0];
      const allRoles = [...new Set(allStaff.flatMap((s) => s.roles || []))];
      setStaffRoles(allRoles);

      // Get today's events (public assignment_mode or staff_management_mode AND date === today JST)
      const allEvents = await base44.entities.Event.list("-date", 50);
      const now = new Date();
      const jstOffset = 9 * 60;
      const jstDate = new Date(now.getTime() + jstOffset * 60000);
      const today = jstDate.toISOString().split("T")[0];
      const activeEvents = allEvents.filter(
        (e) => (e.assignment_mode === "public" || e.staff_management_mode === "public") && e.date === today
      ).sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
      });

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

      // Check if already agreed to compliance for this staff/event combination
      const agreedEvents = activeEvents.filter((event) => {
        const key = `crewly_compliance_${staff.name}_${event.id}`;
        return localStorage.getItem(key) === "true";
      });
      const needsAgreement = activeEvents.length > 0 && agreedEvents.length < activeEvents.length;

      // Store auth data temporarily and show confirmation modal
      setPendingAuthData({
        staffName: staff.name,
        acastId: id,
        eventId: activeEvents[0]?.id || null
      });
      setPositions(allPositions);
      setEvents(activeEvents);
      
      if (needsAgreement) {
        setShowConfirmation(true);
      } else {
        // Already agreed, skip to login
        setStaffName(staff.name);
        localStorage.setItem(STORAGE_KEY, id);
        setAcastId(id);
        setPendingAuthData(null);
      }
    } catch (e) {
      setError("データの取得に失敗しました。");
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const handleShowCompliance = () => {
    setShowConfirmation(false);
    setShowComplianceModal(true);
  };

  const handleConfirmAgreement = () => {
    if (!pendingAuthData) return;
    
    setStaffName(pendingAuthData.staffName);
    localStorage.setItem(STORAGE_KEY, pendingAuthData.acastId);
    setAcastId(pendingAuthData.acastId);
    setPendingAuthData(null);
    setShowComplianceModal(false);

    // Mark compliance as agreed for all active events
    events.forEach((e) => {
      localStorage.setItem(`${COMPLIANCE_STORAGE_PREFIX}${pendingAuthData.staffName}_${e.id}`, "true");
    });
  };

  const handleCancelModal = () => {
    setPendingAuthData(null);
    setShowConfirmation(false);
    setShowComplianceModal(false);
  };

  const handleBackToConfirmation = () => {
    setShowComplianceModal(false);
    setShowConfirmation(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputId.trim()) return;
    authenticate(inputId.trim());
  };

  const handleQRRead = async (qrData) => {
    setQrError("");
    if (!qrData) {
      setQrError("QR コードが検出されませんでした。画像に QR コードが含まれていることを確認してください。");
      return;
    }
    const extractedId = qrData.trim();
    if (!extractedId) {
      setQrError("QR コードから ID を読み取れませんでした");
      return;
    }
    await authenticate(extractedId);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    // Keep compliance agreements on logout
    setAcastId("");
    setStaffName(null);
    setPositions([]);
    setEvents([]);
    setInputId("");
    setError("");
    setQrError("");
    setPendingAuthData(null);
    setShowConfirmation(false);
    setShowComplianceModal(false);
    setStaffRoles([]);
    setPendingRemove(null);
    setRemoving(false);
  }, []);

  const handleStaffRemoveClick = (staffName, position) => {
    setPendingRemove({ staffName, position });
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemove || !acastId) return;
    setRemoving(true);
    try {
      const res = await base44.functions.invoke("removeStaffFromPosition", {
        chiefAcastId: acastId,
        staffName: pendingRemove.staffName,
        positionId: pendingRemove.position.id,
        eventId: pendingRemove.position._eventId,
      });
      const data = res?.data;
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.success) {
        toast.success(`「${pendingRemove.staffName}」さんを「${pendingRemove.position.name}」から削除しました`);
        await refreshPositions();
        setPendingRemove(null);
      }
    } catch (e) {
      toast.error("削除に失敗しました");
    } finally {
      setRemoving(false);
    }
  };

  const isChief = staffRoles.includes("セクションチーフ");

  const refreshPositions = useCallback(async () => {
    if (!acastId || !staffName) return;
    try {
      const allStaff = await base44.entities.Staff.filter({ acast_id: acastId });
      if (!allStaff || allStaff.length === 0) return;
      const staff = allStaff[0];
      const allEvents = await base44.entities.Event.list("-date", 50);
      const now = new Date();
      const jstOffset = 9 * 60;
      const jstDate = new Date(now.getTime() + jstOffset * 60000);
      const today = jstDate.toISOString().split("T")[0];
      const activeEvents = allEvents.filter(
        (e) => (e.assignment_mode === "public" || e.staff_management_mode === "public") && e.date === today
      );
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
      setEvents(activeEvents);
    } catch (e) {
      // silent refresh failure
    }
  }, [acastId, staffName]);

  const handleQrScanSuccess = async (scannedData) => {
    if (!qrScanPosition || !acastId) return;
    if (qrProcessing) return; // Prevent duplicate scans during processing
    setQrProcessing(true);
    try {
      const res = await base44.functions.invoke("addStaffByQr", {
        chiefAcastId: acastId,
        targetAcastId: scannedData.trim(),
        positionId: qrScanPosition.id,
        eventId: qrScanPosition._eventId,
      });
      const data = res?.data;
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.success) {
        toast.success(`「${data.staffName}」さんを「${data.positionName}」に追加しました`);
        await refreshPositions();
        // Add delay before allowing next scan
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (e) {
      toast.error("追加に失敗しました");
    } finally {
      setQrProcessing(false);
    }
  };

  // Keep a ref of staffName for the portal polling callback
  const staffNameRef = useRef(staffName);
  useEffect(() => { staffNameRef.current = staffName; }, [staffName]);

  // Poll for portal restriction changes every 15 seconds
  useEffect(() => {
    if (!initialized) return;

    const checkPortal = async () => {
      try {
        const configs = await base44.entities.AppConfig.filter({ key: "portal_login_disabled" });
        setPortalDisabled(configs?.[0]?.value_bool === true);
      } catch (_) {}
    };

    const interval = setInterval(checkPortal, 15000);
    return () => clearInterval(interval);
  }, [initialized]);

  // Force logout when portal becomes restricted while logged in
  useEffect(() => {
    if (portalDisabled && staffNameRef.current) {
      handleLogout();
    }
  }, [portalDisabled, handleLogout]);

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

  if (portalDisabled) {
    return <PortalMaintenance />;
  }

  // Login screen
  if (!staffName) {
    return (
      <>
        <AnimatePresence>
          {showConfirmation && pendingAuthData && (
            <StaffConfirmationModal
              staffName={pendingAuthData.staffName}
              onConfirm={handleShowCompliance}
              onClose={handleCancelModal}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showComplianceModal && pendingAuthData && (
            <ComplianceAgreementModal
              staffName={pendingAuthData.staffName}
              onConfirm={handleConfirmAgreement}
              onBack={handleBackToConfirmation}
              onClose={handleCancelModal}
            />
          )}
        </AnimatePresence>

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
            <p className="text-xs text-muted-foreground mb-4">A-CAST ID の QR コードをアップロード</p>
            
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
                    placeholder="例：acast staff id"
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
      </>
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
          <CrewlyLogo />
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
            <p className="text-sm font-medium text-muted-foreground">登録されているデータがありません</p>
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
                    {new Date(event.date).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" })}
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
              {(event.time_priority || event.time_open || event.time_start || event.time_end) && (
                <div className="flex flex-wrap gap-x-3 mt-1">
                  {event.time_priority && <EventTimeDisplay className="text-[11px] text-muted-foreground" eventDate={event.date} eventTime={event.time_priority} endTime={event.time_priority_end} label="先行" />}
                  {event.time_open && <EventTimeDisplay className="text-[11px] text-muted-foreground" eventDate={event.date} eventTime={event.time_open} endTime={event.time_open_end} label="開場" />}
                  {event.time_start && <EventTimeDisplay className="text-[11px] text-muted-foreground" eventDate={event.date} eventTime={event.time_start} endTime={event.time_start_end} label="開演" />}
                  {event.time_end && <EventTimeDisplay className="text-[11px] text-muted-foreground" eventDate={event.date} eventTime={event.time_end} endTime={event.time_end_end} label="終演" />}
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
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-sm flex-1">{pos.name}</div>
                            {isChief && (
                              <button
                                onClick={() => setQrScanPosition(pos)}
                                className="flex items-center gap-1 text-[11px] font-medium text-primary border border-primary/30 bg-primary/5 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors shrink-0"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                QR追加
                              </button>
                            )}
                          </div>
                          {pos.notes && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{pos.notes}</p>
                          )}
                          {/* 配置スタッフ一覧 */}
                          {(() => {
                          const allNames = pos.split_by_side
                            ? [...new Set([...(pos.staff_names_kamite || []), ...(pos.staff_names_shimote || [])])]
                            : (pos.staff_names || []);
                          if (allNames.length === 0) return null;
                          return (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {allNames.map((name) => {
                                const isRemovingThis = removing && pendingRemove?.staffName === name && pendingRemove?.position.id === pos.id;
                                return (
                                  <span
                                    key={name}
                                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                                      name === staffName
                                        ? "bg-primary/15 text-primary border border-primary/30"
                                        : "bg-muted text-muted-foreground"
                                    } ${isRemovingThis ? "opacity-50" : ""}`}
                                  >
                                    {name}
                                    {isChief && name !== staffName && (
                                      <button
                                        onClick={() => handleStaffRemoveClick(name, pos)}
                                        className="hover:text-destructive transition-colors"
                                        title="このポジションから削除"
                                        disabled={removing}
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          );
                          })()}
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
                          {pos.added_by && pos.added_at_jst && (
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                              <UserPlus className="w-2.5 h-2.5 inline mr-0.5" />
                              最終追加: {pos.added_by} ({pos.added_at_jst})
                            </p>
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

      {qrScanPosition && (
        <QrCameraScanner
          onScan={handleQrScanSuccess}
          onClose={() => !qrProcessing && setQrScanPosition(null)}
          processing={qrProcessing}
          autoStart={true}
        />
      )}

      {pendingRemove && (
        <ConfirmDialog
          open={true}
          onConfirm={handleConfirmRemove}
          onCancel={() => setPendingRemove(null)}
          message={`「${pendingRemove.staffName}」さんを「${pendingRemove.position.name}」から削除しますか？`}
          confirmLabel="削除"
          confirmVariant="destructive"
        />
      )}
    </div>
  );
}