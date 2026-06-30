import { useState } from "react";
import { X, Plus } from "lucide-react";

export const CATEGORY_PRESETS = ["客案", "場内配置", "場外配置", "楽屋口"];

/**
 * 属性ピッカー: プリセット4択 + 自由テキスト追加。0個または1個選択（単一選択）。
 * @param {string} value - 現在選択中の属性（空文字=未選択）
 * @param {(v: string) => void} onChange
 * @param {boolean} disabled
 */
export default function CategoryPicker({ value, onChange, disabled = false }) {
  const [input, setInput] = useState("");
  const selected = value || "";

  const handlePresetClick = (preset) => {
    if (disabled) return;
    onChange(selected === preset ? "" : preset);
  };

  const handleAddCustom = () => {
    const v = input.trim();
    if (!v || disabled) return;
    onChange(v);
    setInput("");
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {CATEGORY_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            onClick={() => handlePresetClick(preset)}
            className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors disabled:opacity-50 ${
              selected === preset
                ? "bg-primary/10 text-primary border-primary/40"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {preset}
          </button>
        ))}
        {selected && !CATEGORY_PRESETS.includes(selected) && (
          <span className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/40 font-medium">
            {selected}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("")}
              className="hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleAddCustom();
            }
          }}
          placeholder="自由入力で追加（Enter）"
          className="h-7 text-xs flex-1 rounded-md border border-input bg-transparent px-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="button"
          disabled={disabled || !input.trim()}
          onClick={handleAddCustom}
          className="h-7 px-2 text-xs rounded-md border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors disabled:opacity-30 flex items-center gap-0.5 shrink-0"
        >
          <Plus className="w-3 h-3" />追加
        </button>
      </div>
      {selected && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("")}
          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
        >
          属性をクリア
        </button>
      )}
    </div>
  );
}