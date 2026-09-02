import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "", label: "なし" },
  { value: "男", label: "男", activeClass: "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300" },
  { value: "女", label: "女", activeClass: "bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300" },
];

export default function GenderToggle({ value, onChange, disabled = false, size = "sm" }) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value || "none"}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full border font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
              size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
              active
                ? opt.activeClass || "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}