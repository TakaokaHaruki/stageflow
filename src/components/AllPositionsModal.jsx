import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import QrCameraScanner from "@/components/QrCameraScanner";
import ConfirmDialog from "@/components/ConfirmDialog";

const TIME_SLOT_LABELS = {
  "通し": { label: "通し", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400" },
  "開場中": { label: "開場中", color: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800 dark:text-blue-400" },
  "開演中": { label: "開演中", color: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800 dark:text-green-400" },
  "終演後": { label: "終演後", color: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800 dark:text-orange-400" },
};

const SLOT_ORDER = ["通し", "開場中", "開演中", "終演後"];

export default function AllPositionsModal({ open, onClose, events, staffName, acastId, myChiefEventIds, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [allPositions, setAllPositions] = useState([]);
  const [qrScanPosition, setQrScanPosition] = useState(null);
  const [qrProcessing, setQrProcessing] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!events || events.length === 0) return;
    setLoading(true);
    try {
      const results = [];
      for (const event of events) {
        const positions = await base44.entities.Position.filter({ event_id: event.id });
        for (const pos of positions) {
          results.push({ ...pos, _eventName: event.name, _eventId: event.id });
        }
      }
      results.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setAllPositions(results);
    } catch (e) {
      setAllPositions([]);
    } finally {
      setLoading(false);
    }
  }, [events]);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

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
        await fetchAll();
        onRefresh?.();
        setPendingRemove(null);
      }
    } catch (e) {
      toast.error("削除に失敗しました");
    } finally {
      setRemoving(false);
    }
  };

  const handleQrScanSuccess = async (scannedData) => {
    if (!qrScanPosition || !acastId) return;
    if (qrProcessing) return;
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
        await fetchAll();
        onRefresh?.();
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (e) {
      toast.error("追加に失敗しました");
    } finally {
      setQrProcessing(false);
    }
  };

  const groupedByEvent = events.map((event) => {
    const eventPositions = allPositions.filter((p) => p._eventId === event.id);
    const bySlot = {};
    for (const slot of SLOT_ORDER) {
      bySlot[slot] = eventPositions.filter((p) => p.time_slot === slot);
    }
    return { event, bySlot };
  });

  const isMyPosition = (pos) => {
    const inMain = (pos.staff_names || []).includes(staffName);
    const inKamite = (pos.staff_names_kamite || []).includes(staffName);
    const inShimote = (pos.staff_names_shimote || []).includes(staffName);
    return inMain || inKamite || inShimote;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="bg-background w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-sm">全ポジション配置</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-4 py-4 flex-1 scrollbar-hide">
              {loading && (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}

              {!loading && allPositions.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-12">ポジションがありません</p>
              )}

              {!loading && groupedByEvent.map(({ event, bySlot }) => (
                <div key={event.id} className="mb-5 last:mb-0">
                  <div className="mb-2">
                    <h3 className="font-bold text-sm">{event.name}</h3>
                  </div>

                  {SLOT_ORDER.map((slot) => {
                    const slotPositions = bySlot[slot];
                    if (!slotPositions || slotPositions.length === 0) return null;
                    const slotStyle = TIME_SLOT_LABELS[slot];
                    return (
                      <div key={slot} className="mb-3">
                        <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border mb-1.5 ${slotStyle.color}`}>
                          {slotStyle.label}
                        </div>
                        <div className="space-y-1.5">
                          {slotPositions.map((pos) => {
                            const mine = isMyPosition(pos);
                            const allNames = pos.split_by_side
                              ? [...new Set([...(pos.staff_names_kamite || []), ...(pos.staff_names_shimote || [])])]
                              : (pos.staff_names || []);
                            const chiefs = (pos.chief_names && pos.chief_names.length > 0) ? pos.chief_names : (pos.chief_name ? [pos.chief_name] : []);
                            const kamite = pos.staff_names_kamite || [];
                            const shimote = pos.staff_names_shimote || [];
                            return (
                              <div
                                key={pos.id}
                                className={`bg-card rounded-xl p-3 ${mine ? "border-2 border-primary" : "border border-border"}`}
                                style={!mine && pos.color ? { borderLeftColor: pos.color, borderLeftWidth: 3 } : {}}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-bold text-sm">{pos.name}</span>
                                    {mine && (
                                      <span className="text-[10px] font-bold text-primary-foreground bg-primary px-1.5 py-0.5 rounded-full shrink-0">
                                        担当
                                      </span>
                                    )}
                                  </div>
                                  {myChiefEventIds?.has(event.id) && (
                                    <button
                                      onClick={() => setQrScanPosition(pos)}
                                      className="flex items-center gap-1 text-[11px] font-medium text-primary border border-primary/30 bg-primary/5 px-2 py-1.5 rounded-lg hover:bg-primary/10 active:scale-95 transition-all shrink-0 min-h-[36px]"
                                    >
                                      <QrCode className="w-3.5 h-3.5" />
                                      QR追加
                                    </button>
                                  )}
                                </div>
                                {pos.split_by_side && (
                                  <span className="text-[10px] text-muted-foreground">上下分割</span>
                                )}
                                {chiefs.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {chiefs.map((chiefName) => (
                                      <span
                                        key={chiefName}
                                        className="inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        <span className="text-[10px] opacity-80">チーフ</span>
                                        {chiefName}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {pos.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{pos.notes}</p>
                                )}
                                {allNames.length > 0 && (
                                  <div className="mt-2 space-y-0.5">
                                    {pos.split_by_side ? (
                                      <>
                                        {kamite.length > 0 && (
                                          <div className="text-[11px] text-muted-foreground">
                                            <span className="font-semibold">上手:</span> {kamite.join("、")}
                                          </div>
                                        )}
                                        {shimote.length > 0 && (
                                          <div className="text-[11px] text-muted-foreground">
                                            <span className="font-semibold">下手:</span> {shimote.join("、")}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      allNames.map((name) => {
                                        const canRemove = chiefs.includes(staffName) && name !== staffName;
                                        const isRemovingThis = removing && pendingRemove?.staffName === name && pendingRemove?.position.id === pos.id;
                                        return (
                                          <div
                                            key={name}
                                            className={`text-sm py-0.5 px-1 rounded font-bold flex items-center gap-1 ${
                                              name === staffName ? "text-primary" : "text-foreground"
                                            } ${isRemovingThis ? "opacity-50" : ""}`}
                                          >
                                            <span className="text-muted-foreground/50">・</span>
                                            <span>{name}</span>
                                            {canRemove && (
                                              <button
                                                onClick={() => handleStaffRemoveClick(name, pos)}
                                                className="hover:text-destructive transition-colors"
                                                title="このポジションから削除"
                                                disabled={removing}
                                              >
                                                <X className="w-2.5 h-2.5" />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              <Button variant="outline" className="w-full min-h-[44px]" onClick={() => { setQrScanPosition(null); onClose(); }}>閉じる</Button>
            </div>
          </motion.div>
        </motion.div>
      )}

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
    </AnimatePresence>
  );
}