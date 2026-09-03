import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronRight, AlertCircle, Plus, Minus, Edit3, Check } from "lucide-react";
import ModalShell from "@/components/ModalShell";

const STATUS_CONFIG = {
  added: { label: "新規", cls: "text-green-700 bg-green-100", icon: Plus },
  removed: { label: "削除", cls: "text-red-700 bg-red-100", icon: Minus },
  modified: { label: "変更", cls: "text-amber-700 bg-amber-100", icon: Edit3 },
  same: { label: "同一", cls: "text-muted-foreground bg-muted", icon: Check },
};

function itemSummary(sectionKey, record) {
  if (!record) return null;
  switch (sectionKey) {
    case "positions":
      return [record.name, (record.staff_names || []).join(", ")].filter(Boolean).join(": ");
    case "staff":
      return [record.name, record.gender].filter(Boolean).join(" / ");
    case "emergency_contacts":
      return [record.role_title, record.name, record.phone].filter(Boolean).join(" / ");
    case "event_sheets":
      return record.custom_notes ? (record.custom_notes.length > 40 ? record.custom_notes.slice(0, 40) + "..." : record.custom_notes) : "(空)";
    case "announcements":
      return [record.title, record.priority].filter(Boolean).join(" / ");
    case "shared_files":
      return [record.title].filter(Boolean).join("");
    case "side_settings":
      return `設定データ (${Object.keys(record).length}項目)`;
    case "map_areas":
      return [record.name, record.type].filter(Boolean).join(" / ");
    case "tasks":
      return [record.title, record.is_done ? "✓" : ""].filter(Boolean).join(" ");
    case "position_type_overrides":
      return record.position_type_name;
    default:
      return record.name || record.title || "";
  }
}

export default function BackupCompareModal({ backup, onClose, onRestore, isRestoring }) {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("restorePositions", { backup_id: backup.id, compare_only: true });
        if (cancelled) return;
        const data = res?.data || res;
        setComparison(data);
        const expanded = {};
        for (const s of (data?.comparison || [])) {
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
  }, [backup.id]);

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = comparison?.comparison || [];
  const totalChanges = sections.reduce((acc, s) => acc + s.added + s.removed + s.modified, 0);

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold">復元前の確認（新旧比較）</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            「{backup.label || "バックアップ"}」({backup.created_at_jst || ""})
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
                {totalChanges > 0 ? (
                  <><AlertCircle className="w-3.5 h-3.5 inline mr-1 text-amber-500 align-text-bottom" />{totalChanges}件の変更があります。復元すると<strong className="text-foreground">現在のデータが全て上書き</strong>されます。下記を確認してから実行してください。</>
                ) : (
                  "現在のデータとバックアップ内容は同一です。"
                )}
              </p>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
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
                        バックアップ {s.backup_count}件 / 現在 {s.current_count}件
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
                                      <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">バックアップ</p>
                                      <p className="text-foreground break-words">{itemSummary(s.key, d.backup) || "—"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">現在</p>
                                      <p className="text-foreground break-words">{itemSummary(s.key, d.current) || "—"}</p>
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

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
              <Button className="flex-1" onClick={onRestore} disabled={isRestoring}>
                {isRestoring ? "復元中..." : "復元を実行"}
              </Button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}