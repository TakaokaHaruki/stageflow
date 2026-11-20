import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

export function ResponsiveSelect({
  value,
  onValueChange,
  placeholder,
  options,
  label,
  className = "",
}) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile) {
    // iOSではドロワー内リストのスクロール中にタップが拾えないことがあるため、
    // モバイルではOSネイティブの選択UIを使用する（確実に選択できる）
    return (
      <div className="relative w-full">
        <select
          value={value ?? ""}
          onChange={(e) => onValueChange(e.target.value)}
          aria-label={label}
          className={`w-full h-9 appearance-none rounded-md border border-input bg-background shadow-sm px-2.5 pr-8 text-[16px] sm:text-sm select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            value ? "text-foreground" : "text-muted-foreground"
          } ${className}`}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`h-9 select-none ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.filter((option) => option.value !== "").map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}