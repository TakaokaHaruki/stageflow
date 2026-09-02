import { Toaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PendingApproval from '@/components/PendingApproval';
import { ThemeProvider } from '@/lib/ThemeProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
// Add page imports here
import Landing from "./pages/Landing";
import StaffPortal from "./pages/StaffPortal";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ManagementSettings from "./pages/ManagementSettings";

const pageVariants = {
  initial: { opacity: 0, x: "100%" },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: "-30%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  const location = useLocation();

  // Handle authentication errors (only for user_not_registered)
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Unapproved users see the pending approval screen
  if (user?.role === 'unapproved') {
    return <PendingApproval />;
  }

  // Render the main app
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen"
      >
        <Routes location={location}>
          {/* Public auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Public pages - accessible without login */}
          <Route path="/" element={<StaffPortal />} />
          <Route path="/home" element={<Landing />} />
          
          {/* Protected app routes - require login */}
          <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
            <Route path="/events" element={<Events />} />
            <Route path="/events/:eventId" element={<EventDetail />} />
            <Route path="/management" element={<ManagementSettings />} />
          </Route>
          
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
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