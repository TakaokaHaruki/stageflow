import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { X, Pencil, Check } from "lucide-react";

// 10分刻みの時刻オプション（00:00〜23:50）
const TIME_OPTIONS = Array.from({ length: 144 }, (_, i) => {
  const h = Math.floor(i / 6);
  const m = (i % 6) * 10;
  const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return { value: val, label: val };
});

const HHMM_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

function normalize(val) {
  if (!val) return "";
  const m = val.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return val;
  return `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}`;
}

/**
 * 時刻フィールド：デフォルトは10分刻みのセレクト。
 * 編集アイコンでフリー入力（HH:MM）に切替可能。
 */
export default function TimeField({ value, onValueChange, placeholder = "--:--", label = "時刻", onClear }) {
  // 既存値が10分刻みに合致しない場合はフリー入力モードで開始
  const isValidStep = useMemo(() => {
    if (!value) return true;
    const m = value.match(HHMM_RE);
    if (!m) return false;
    return Number(m[2]) % 10 === 0;
  }, [value]);

  const [freeMode, setFreeMode] = useState(!isValidStep);
  const [draft, setDraft] = useState(value || "");
  const [error, setError] = useState(false);

  const handleFreeBlur = () => {
    const norm = normalize(draft);
    if (!draft) {
      onValueChange("");
      setError(false);
      return;
    }
    if (HHMM_RE.test(norm)) {
      onValueChange(norm);
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex-1 min-w-0">
      {freeMode ? (
        <div className="flex items-center gap-1">
          <Input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(false); }}
            onBlur={handleFreeBlur}
            placeholder="HH:MM"
            className={`h-9 sm:h-8 text-sm ${error ? "border-destructive" : ""}`}
            inputMode="numeric"
          />
          <button
            type="button"
            onClick={() => {
              setFreeMode(false);
              setError(false);
              if (HHMM_RE.test(normalize(draft))) onValueChange(normalize(draft));
            }}
            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
            title="10分刻みに戻す"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <ResponsiveSelect
            value={value || ""}
            onValueChange={onValueChange}
            placeholder={placeholder}
            options={TIME_OPTIONS}
            label={label}
          />
          <button
            type="button"
            onClick={() => { setFreeMode(true); setDraft(value || ""); }}
            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
            title="細かい時刻を直接入力"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={!value}
              className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors shrink-0"
              aria-label="クリア"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      {error && <p className="text-[10px] text-destructive mt-0.5">HH:MM形式で入力してください</p>}
    </div>
  );
}