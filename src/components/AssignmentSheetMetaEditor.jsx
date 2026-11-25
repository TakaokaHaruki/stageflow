import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { User, Shirt } from "lucide-react";
import { toast } from "sonner";

// 配置表PDFのヘッダーに印字するチーフ名・クローク名をイベントへ保存するインライン編集バー
export default function AssignmentSheetMetaEditor({ eventId, event, canEdit }) {
  const [chiefName, setChiefName] = useState("");
  const [cloakName, setCloakName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setChiefName(event?.chief_name || "");
    setCloakName(event?.cloak_name || "");
  }, [event?.chief_name, event?.cloak_name]);

  if (!canEdit) return null;

  const save = async (field, value) => {
    if ((event?.[field] || "") === value) return;
    setSaving(true);
    try {
      await base44.entities.Event.update(eventId, { [field]: value });
    } catch (e) {
      toast.error("保存に失敗しました");
      setChiefName(event?.chief_name || "");
      setCloakName(event?.cloak_name || "");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-card p-2 shadow-card">
      <div className="flex items-center gap-1.5">
        <User className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[11px] font-bold text-muted-foreground shrink-0">チーフ</span>
        <Input
          className="h-7 w-40 text-xs"
          value={chiefName}
          onChange={(e) => setChiefName(e.target.value)}
          onBlur={() => save("chief_name", chiefName)}
          placeholder="チーフ名"
          disabled={saving}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Shirt className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[11px] font-bold text-muted-foreground shrink-0">クローク</span>
        <Input
          className="h-7 w-40 text-xs"
          value={cloakName}
          onChange={(e) => setCloakName(e.target.value)}
          onBlur={() => save("cloak_name", cloakName)}
          placeholder="クローク名"
          disabled={saving}
        />
      </div>
    </div>
  );
}