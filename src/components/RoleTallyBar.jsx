import { useMemo } from "react";
import { useAllRoles } from "@/hooks/useAllRoles";
import { getRoleBadgeClass } from "@/lib/staffRoles";
import RoleIcon from "@/components/RoleIcon";

/**
 * 配置表のスタッフに付与されている役割ごとの人数を表示する。
 * 固定役割（インカム・バラシ・セクションチーフ）＋カスタム役割を含め、
 * staffList内で1名以上が所持している役割のみをバッジ形式で並べる。
 */
export default function RoleTallyBar({ staffList }) {
  const { allRoles } = useAllRoles();

  const tally = useMemo(() => {
    const counts = {};
    (staffList || []).forEach((s) => {
      (s.roles || []).forEach((r) => {
        counts[r] = (counts[r] || 0) + 1;
      });
    });
    // 固定＋カスタムの定義順でソート、未定義の役割は末尾
    const order = allRoles.map((r) => r.name);
    return Object.entries(counts)
      .sort((a, b) => {
        const ia = order.indexOf(a[0]);
        const ib = order.indexOf(b[0]);
        return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
      })
      .filter(([, n]) => n > 0);
  }, [staffList, allRoles]);

  if (tally.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] font-bold text-muted-foreground shrink-0">役割</span>
      {tally.map(([role, count]) => (
        <span
          key={role}
          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${getRoleBadgeClass(role)}`}
        >
          <RoleIcon role={role} className="w-2.5 h-2.5" />
          {count}
        </span>
      ))}
    </div>
  );
}