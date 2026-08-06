import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { motion } from "framer-motion";
import CrewlyLogo from "@/components/CrewlyLogo";

export default function Landing() {
  const navigate = useNavigate();

  // No auto-redirect for authenticated users on Landing page

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
        <div className="flex flex-col items-center mb-5">
          <CrewlyLogo disableLink iconOnly size={56} className="mb-4" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">Crew<span className="text-primary">ly</span></h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          スタッフ管理及び配置など<br />一元化するコンサート運営システム
        </p>

        <div className="flex flex-col gap-3 w-full">
          <Button onClick={handleLogin} className="h-11 text-sm font-semibold gap-2">
            <LogIn className="w-4 h-4" />
            ログイン
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6 leading-relaxed">
          A-CAST社員の方・チーフの方はログインしてご利用ください
        </p>
      </motion.div>
    </div>
  );
}