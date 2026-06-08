import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogIn, Eye } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    // Already logged in → skip to events
    base44.auth.isAuthenticated().then((authed) => {
      if (authed) navigate("/events", { replace: true });
    });
  }, [navigate]);

  const handleGuest = () => {
    localStorage.setItem("guest_mode", "true");
    navigate("/events");
  };

  const handleLogin = () => {
    localStorage.removeItem("guest_mode");
    base44.auth.redirectToLogin(`${window.location.origin}/events`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        className="flex flex-col items-center text-center max-w-sm w-full"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo / Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <span className="text-2xl font-black text-primary tracking-tighter">AC</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">A-CASTイベント管理</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          スタッフ配置・アナウンス・タスク管理を<br />一元化するイベント運営システム
        </p>

        <div className="flex flex-col gap-3 w-full">
          <Button onClick={handleLogin} className="h-11 text-sm font-semibold gap-2">
            <LogIn className="w-4 h-4" />
            ログイン
          </Button>
          <Button onClick={handleGuest} variant="outline" className="h-11 text-sm gap-2">
            <Eye className="w-4 h-4" />
            ゲストとして閲覧
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6 leading-relaxed">
          A-CAST社員・チーフの方はログインしてご利用ください
        </p>
      </motion.div>
    </div>
  );
}