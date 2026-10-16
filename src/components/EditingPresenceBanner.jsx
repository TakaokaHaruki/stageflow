import { useState, useEffect } from "react";
import { Users, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { parseJst, ONLINE_WINDOW_MS, ACTIVE_WINDOW_MS } from "@/lib/presenceTime";

// 「自分を表示」トグルの状態（localStorageに永続化）
const SHOW_SELF_KEY = "editing_presence_show_self";

/**
 * 同じイベントを編集中の他ユーザーをバッジで表示。
 * - 在席（オンライン）: muted バッジ
 * - 操作中（直近60秒以内に操作）: primary 強調バッジ＋ペンアイコン
 * - 管理者は他ユーザーからは表示されない（自分自身のみトグルで表示可能）
 */
export default function EditingPresenceBanner({ presences, currentUserId }) {
  const [, setTick] = useState(0);
  const [showSelf, setShowSelf] = useState(() => {
    try { return localStorage.getItem(SHOW_SELF_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  if (!presences || presences.length === 0) return null;

  const now = Date.now();
  const toItem = (p) => {
    const lastHb = parseJst(p.last_heartbeat_at_jst);
    const lastAct = parseJst(p.last_active_at_jst);
    const online = p.is_active && lastHb && now - lastHb < ONLINE_WINDOW_MS;
    const editing = lastAct && now - lastAct < ACTIVE_WINDOW_MS;
    return { p, online, editing };
  };

  const others = presences
    .filter((p) => p.user_id && p.user_id !== currentUserId && p.role !== "admin")
    .map(toItem)
    .filter((it) => it.online);

  // トグルON時のみ自分の在席を表示
  const selfItem = showSelf
    ? presences.filter((p) => p.user_id === currentUserId).map(toItem).find((it) => it.online)
    : null;

  if (others.length === 0 && !selfItem) return null;

  const renderBadge = (item, isSelf) => (
    <span
      key={item.p.user_id}
      className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
        item.editing
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-muted-foreground"
      }`}
      title={
        isSelf
          ? `${item.p.user_name} さん（自分）`
          : item.editing
            ? `${item.p.user_name} さんが操作中`
            : `${item.p.user_name} さんが開いています`
      }
    >
      {item.editing && <Pencil className="w-2.5 h-2.5" />}
      {item.p.user_name}
      {isSelf && <span className="opacity-70">（自分）</span>}
    </span>
  );

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-2 py-1 mb-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] font-semibold text-primary shrink-0">
          <Users className="w-3 h-3" />同時編集中
        </span>
        {others.map((it) => renderBadge(it, false))}
        {selfItem && renderBadge(selfItem, true)}
      </div>
      <label className="flex items-center gap-1.5 w-fit cursor-pointer select-none mt-0.5">
        <Switch
          checked={showSelf}
          onCheckedChange={(v) => {
            setShowSelf(v);
            try { localStorage.setItem(SHOW_SELF_KEY, v ? "1" : "0"); } catch {}
          }}
          className="scale-[0.75] -mx-1.5"
        />
        <span className="text-[10px] text-muted-foreground">自分を表示</span>
      </label>
    </div>
  );
}