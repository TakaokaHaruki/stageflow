import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogIn, Eye } from "lucide-react";
import { motion } from "framer-motion";
import CrewlyLogo from "@/components/CrewlyLogo";

export default function Landing() {
  const navigate = useNavigate();

  // No auto-redirect for authenticated users on Landing page

  const handleGuest = () => {
    localStorage.setItem("guest_mode", "true");
    navigate("/events");
  };

  const handleLogin = () => {
    localStorage.removeItem("guest_mode");
    navigate("/login");
  };

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Fixed top bar with logo */}
      <div className="fixed top-0 left-0 right-0 h-12 flex items-center px-4 border-b border-border bg-background/80 backdrop-blur-md z-50 safe-area-top">
        <CrewlyLogo />
      </div>
      <motion.div
        className="flex flex-col items-center text-center max-w-sm w-full"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo / Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <span className="text-2xl font-black text-primary tracking-tighter">Cr</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">Crewly</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          スタッフ配置・アナウンス・タスク管理を<br />一元化するコンサート運営システム
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
          スタッフ・チーフの方はログインしてご利用ください
        </p>
      </motion.div>
    </div>
  );
}