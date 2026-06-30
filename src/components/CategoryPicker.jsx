import { useState } from "react";
import { X, Plus } from "lucide-react";
import { usePositionCategories } from "@/hooks/usePositionCategories";

/**
 * 属性ピッカー: マスターリスト（AppConfig.position_categories）から候補を表示 + 自由テキスト追加。
 * 自由追加時はマスターリストにも自動追記され、他イベントでも利用可能になる。
 * @param {string} value - 現在選択中の属性（空文字=未選択）
 * @param {(v: string) => void} onChange
 * @param {boolean} disabled
 */
export default function CategoryPicker({ value, onChange, disabled = false }) {
  const { categories, addCategory } = usePositionCategories();
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
    if (!categories.includes(v)) {
      addCategory(v);
    }
    setInput("");
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {categories.map((preset) => (
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
        {selected && !categories.includes(selected) && (
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