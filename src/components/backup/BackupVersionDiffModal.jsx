import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import ModalShell from "@/components/ModalShell";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, ChevronDown, ChevronRight, Plus, Minus, Edit3, Check } from "lucide-react";
import { itemSummary } from "@/components/BackupCompareModal";

const STATUS_CONFIG = {
  added: { label: "新規", cls: "text-green-700 bg-green-100", icon: Plus },
  removed: { label: "削除", cls: "text-red-700 bg-red-100", icon: Minus },
  modified: { label: "変更", cls: "text-amber-700 bg-amber-100", icon: Edit3 },
  same: { label: "同一", cls: "text-muted-foreground bg-muted", icon: Check },
};

/**
 * 2つのバックアップバージョン（古い・新しい）の差分を表示するモーダル。
 * 差分判定は復元時の新旧比較と同一の複合キー（名前＋時間帯＋パーツ）ロジックに基づく。
 */
export default function BackupVersionDiffModal({ older, newer, onClose }) {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("compareBackups", { older_id: older.id, newer_id: newer.id });
        if (cancelled) return;
        const data = res?.data || res;
        setComparison(data);
        const expanded = {};
        for (const s of data?.comparison || []) {
          if (s.added > 0 || s.removed > 0 || s.modified > 0) expanded[s.key] = true;
        }
        setExpandedSections(expanded);
      } catch (e) {
        if (!cancelled) setError(e?.message || "比較データの取得に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [older.id, newer.id]);

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = comparison?.comparison || [];
  const totalChanges = sections.reduce((acc, s) => acc + s.added + s.removed + s.modified, 0);

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold">バージョン比較</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-semibold">古い</span>: {older.label || "バックアップ"} ({older.created_at_jst || ""})
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">新しい</span>: {newer.label || "バックアップ"} ({newer.created_at_jst || ""})
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">比較データを取得中...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="rounded-lg border border-border bg-muted/30 p-2.5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {totalChanges > 0
                  ? `選択した2つのバージョン間に ${totalChanges} 件の差分があります。`
                  : "選択した2つのバージョンは同一の内容です。"}
              </p>
            </div>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {sections.map((s) => {
                const hasChanges = s.added > 0 || s.removed > 0 || s.modified > 0;
                const expanded = expandedSections[s.key];
                return (
                  <div key={s.key} className="rounded-lg border border-border overflow-hidden">
                    <button
                      className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/50 text-left"
                      onClick={() => toggleSection(s.key)}
                    >
                      {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                      <span className="text-sm font-medium flex-1">{s.label}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        古い {s.current_count}件 / 新しい {s.backup_count}件
                      </span>
                      {hasChanges && (
                        <div className="flex gap-1 shrink-0">
                          {s.added > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">+{s.added}</span>}
                          {s.removed > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">-{s.removed}</span>}
                          {s.modified > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">±{s.modified}</span>}
                        </div>
                      )}
                    </button>
                    {expanded && (
                      <div className="border-t border-border divide-y divide-border">
                        {s.details.length === 0 ? (
                          <p className="p-2 text-xs text-muted-foreground text-center">データなし</p>
                        ) : (
                          s.details.map((d, i) => {
                            const cfg = STATUS_CONFIG[d.status];
                            const Icon = cfg.icon;
                            return (
                              <div key={i} className="flex items-start gap-2 p-2 text-xs">
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${cfg.cls} shrink-0`}>
                                  <Icon className="w-3 h-3" />{cfg.label}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">古い</p>
                                      <p className="text-foreground break-words">{itemSummary(s.key, d.current) || "—"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">新しい</p>
                                      <p className="text-foreground break-words">{itemSummary(s.key, d.backup) || "—"}</p>
                                    </div>
                                  </div>
                                </div>
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
          </>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>閉じる</Button>
        </div>
      </div>
    </ModalShell>
  );
}