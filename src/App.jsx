import { Toaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import AppNav from './components/AppNav';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PendingApproval from '@/components/PendingApproval';
import RestrictedScreen from '@/components/RestrictedScreen';
import { ThemeProvider } from '@/lib/ThemeProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
// Add page imports here
import Home from "./pages/Home";
import Account from "./pages/Account";
import Information from "./pages/Information";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import StaffPortal from "./pages/StaffPortal";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ManagementSettings from "./pages/ManagementSettings";
import StaffSearch from "./pages/StaffSearch";
import SupportChat from "./pages/SupportChat";
import Concerts from "./pages/Concerts";
import AccessInsights from "./pages/AccessInsights";
import AccessLogTracker from "./components/AccessLogTracker";

const AuthenticatedApp = () => {
  const { authError, user } = useAuth();
  const location = useLocation();
  // 未ログインで直リンクされた場合、ログイン後に元のページへ戻れるよう遷移元を保持
  const loginPath = `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`;

  // Render the main app
  // アプリ全体のページアクセスを記録する共通トラッカー（未承認・利用制限・登録未完了ユーザー含む全ユーザー対象）
  return (
    <>
      <AccessLogTracker />
      {authError?.type === 'user_not_registered' ? (
        <UserNotRegisteredError />
      ) : user?.role === 'unapproved' ? (
        <PendingApproval />
      ) : user?.role === 'restricted' ? (
        <RestrictedScreen />
      ) : (
      <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public pages - accessible without login */}
      <Route path="/" element={<StaffPortal />} />

      {/* Protected app routes - require login */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to={loginPath} replace />} />}>
        {/* 共通ナビ（ヘッダー・サイドバー固定）配下のページ。遷移時はコンテンツのみ差し替わる */}
        <Route element={<AppNav />}>
          <Route path="/home" element={<Home />} />
          <Route path="/account" element={<Account />} />
          <Route path="/information" element={<Information />} />
          <Route path="/admin-settings" element={<AdminSettingsPage />} />
          <Route path="/events" element={<Events />} />
          <Route path="/support" element={<SupportChat />} />
          <Route path="/concerts" element={<Concerts />} />
          <Route path="/management" element={<ManagementSettings />} />
          <Route path="/staff-search" element={<StaffSearch />} />
          {/* 管理者専用ページ */}
          <Route element={<AdminRoute />}>
            <Route path="/access-insights" element={<AccessInsights />} />
          </Route>
        </Route>
        {/* イベント詳細は独自レイアウトを持つため共通ナビ対象外 */}
        <Route path="/events/:eventId" element={<EventDetail />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
      </Routes>
      )}
    </>
  );
};


function App() {

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster position="top-center" zIndex={99999} />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App