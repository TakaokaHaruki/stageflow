import { useMemo } from "react";
import { STAFF_ROLES, getRoleBadgeClass, getRoleIconColor } from "@/lib/staffRoles";
import { useCustomRoles } from "@/hooks/useCustomRoles";

/**
 * 固定役割（STAFF_ROLES）＋カスタム役割（AppConfig.custom_roles）を統合し、
 * 役割名 → バッジクラス / アイコン色 を解決する関数を提供する。
 */
export function useAllRoles() {
  const { customRoles, saveRoles } = useCustomRoles();

  const colorMap = useMemo(() => {
    const map = {};
    customRoles.forEach((r) => {
      if (r.name && r.color) map[r.name] = r.color;
    });
    return map;
  }, [customRoles]);

  const allRoles = useMemo(
    () => [
      ...STAFF_ROLES.map((name) => ({ name, color: null, fixed: true })),
      ...customRoles.map((r) => ({ name: r.name, color: r.color, fixed: false })),
    ],
    [customRoles]
  );

  const getBadgeClass = useMemo(() => (role) => getRoleBadgeClass(role, colorMap[role]), [colorMap]);
  const getIconColor = useMemo(() => (role) => getRoleIconColor(role, colorMap[role]), [colorMap]);

  return { allRoles, customRoles, colorMap, getBadgeClass, getIconColor, saveRoles };
}