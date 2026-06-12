import CrewlyLogo from "@/components/CrewlyLogo";
import { ShieldOff } from "lucide-react";

export default function PortalMaintenance() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <CrewlyLogo />
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