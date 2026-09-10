import { Navigate, Outlet } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * 管理者（admin）専用ページ用のルートガード。
 * ロール判定中はローディングを表示し、admin以外はホームへリダイレクトする。
 */
export default function AdminRoute() {
  const { role, isAdmin } = useUserRole();

  if (role === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}