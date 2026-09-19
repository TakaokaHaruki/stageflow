import { useState, useEffect } from "react";
import { Users, Pencil } from "lucide-react";
import { parseJst, ONLINE_WINDOW_MS, ACTIVE_WINDOW_MS } from "@/lib/presenceTime";

/**
 * 同じイベントを編集中の他ユーザーをバッジで表示。
 * - 在席（オンライン）: muted バッジ
 * - 操作中（直近60秒以内に操作）: primary 強調バッジ＋ペンアイコン
 */
export default function EditingPresenceBanner({ presences, currentUserId }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  if (!presences || presences.length === 0) return null;

  const now = Date.now();
  const others = presences
    .filter((p) => p.user_id && p.user_id !== currentUserId)
    .map((p) => {
      const lastHb = parseJst(p.last_heartbeat_at_jst);
      const lastAct = parseJst(p.last_active_at_jst);
      const online = p.is_active && lastHb && now - lastHb < ONLINE_WINDOW_MS;
      const editing = lastAct && now - lastAct < ACTIVE_WINDOW_MS;
      return { p, online, editing };
    })
    .filter((it) => it.online);

  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap rounded-lg border border-primary/30 bg-primary/5 px-2 py-1 mb-1.5">
      <span className="flex items-center gap-1 text-[10px] font-semibold text-primary shrink-0">
        <Users className="w-3 h-3" />同時編集中
      </span>
      {others.map(({ p, editing }) => (
        <span
          key={p.user_id}
          className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
            editing
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground"
          }`}
          title={editing ? `${p.user_name} さんが操作中` : `${p.user_name} さんが開いています`}
        >
          {editing && <Pencil className="w-2.5 h-2.5" />}
          {p.user_name}
        </span>
      ))}
    </div>
  );
}