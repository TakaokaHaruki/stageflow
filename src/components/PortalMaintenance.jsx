import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import CrewlyLogo from "@/components/CrewlyLogo";
import { ShieldOff } from "lucide-react";

export default function PortalMaintenance() {
  const navigate = useNavigate();
  const clickCountRef = useRef(0);
  const resetTimerRef = useRef(null);

  const handleLogoClick = () => {
    clickCountRef.current += 1;
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      navigate("/home");
      return;
    }
    resetTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div className="cursor-pointer" onClick={handleLogoClick}>
          <CrewlyLogo disableLink />
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldOff className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-lg font-bold text-foreground">現在スタッフポータルはご利用いただけません</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            スタッフポータルへのアクセスは一時的に制限されています。<br />
            担当者にお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}