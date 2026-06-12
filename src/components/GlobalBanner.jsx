import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle } from "lucide-react";

export default function GlobalBanner() {
  const { data: configs = [] } = useQuery({
    queryKey: ["appConfig", "global_banner_message"],
    queryFn: () => base44.entities.AppConfig.filter({ key: "global_banner_message" }, null, 1),
    refetchInterval: 30000,
  });

  const msg = configs?.[0]?.value;
  if (!msg || !msg.trim()) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/40 px-3 py-2 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed whitespace-pre-wrap">{msg}</p>
    </div>
  );
}