import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";

export default function ThemeToggle() {
  const { isDark, setIsDark } = useTheme();
  const label = isDark ? "ライトモードに切り替え" : "ダークモードに切り替え";

  return (
    <button
      type="button"
      onClick={() => setIsDark(!isDark)}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
