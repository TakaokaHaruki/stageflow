import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, FileText, ExternalLink, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";

export default function PositionTypeOverrideSection({ eventId, positionType }) {
  const [description, setDescription] = useState("");
  const [resources, setResources] = useState([]);
  const [urlLabel, setUrlLabel] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const descRef = useRef("");
  const resRef = useRef([]);
  const queryClient = useQueryClient();

  const { data: override } = useQuery({
    queryKey: ["positionTypeOverride", eventId, positionType.name],
    queryFn: () =>
      base44.entities.PositionTypeOverride.filter({
        event_id: eventId,
        position_type_name: positionType.name,
      }),
    select: (d) => d?.[0] || null,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  useEffect(() => {
    const newDesc = override?.description || "";
    const newRes = override?.resources || [];
    setDescription(newDesc);
    setResources(newRes);
    descRef.current = newDesc;
    resRef.current = newRes;
  }, [override?.id]);

  const hasOverride = Boolean(override);

  const save = async (newDesc, newRes) => {
    setSaving(true);
    try {
      if (hasOverride) {
        await base44.entities.PositionTypeOverride.update(override.id, {
          description: newDesc,
          resources: newRes,
        });
      } else {
        await base44.entities.PositionTypeOverride.create({
          event_id: eventId,
          position_type_name: positionType.name,
          description: newDesc,
          resources: newRes,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["positionTypeOverride", eventId, positionType.name] });
      descRef.current = newDesc;
      resRef.current = newRes;
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (description === descRef.current) return;
    const timer = setTimeout(() => {
      save(description, resources);
    }, 800);
    return () => clearTimeout(timer);
  }, [description]);

  const handleAddUrl = () => {
    if (!urlValue.trim()) return;
    const newRes = [...resources, { type: "url", label: urlLabel.trim() || urlValue.trim(), url: urlValue.trim() }];
    setResources(newRes);
    setUrlLabel("");
    setUrlValue("");
    save(description, newRes);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newRes = [...resources, { type: "file", label: file.name, url: file_url }];
      setResources(newRes);
      save(description, newRes);
    } catch {
      toast.error("ファイルのアップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteResource = (idx) => {
    const newRes = resources.filter((_, i) => i !== idx);
    setResources(newRes);
    save(description, newRes);
  };

  const handleClearOverride = async () => {
    if (!hasOverride) return;
    try {
      await base44.entities.PositionTypeOverride.delete(override.id);
      queryClient.invalidateQueries({ queryKey: ["positionTypeOverride", eventId, positionType.name] });
      setDescription("");
      setResources([]);
      descRef.current = "";
      resRef.current = [];
      toast.success("上書きをクリアしました");
    } catch {
      toast.error("クリアに失敗しました");
    }
  };

  const baseDesc = positionType.description || "";
  const baseRes = positionType.resources || [];

  return (
    <div className="space-y-3">
      {/* Base info reference (read-only) */}
      {(baseDesc || baseRes.length > 0) && (
        <div className="bg-muted/40 rounded-lg p-3 space-y-1.5 border border-border">
          <p className="text-[11px] font-semibold text-muted-foreground">基本設定（全イベント共通）</p>
          {baseDesc && (
            <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{baseDesc}</p>
          )}
          {baseRes.length > 0 && (
            <div className="space-y-1 pt-1">
              {baseRes.map((res, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {res.type === "file" ? <FileText className="w-3 h-3 shrink-0" /> : <ExternalLink className="w-3 h-3 shrink-0" />}
                  <span className="truncate">{res.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Override inputs */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-foreground">
            上書き説明文{saving && <span className="text-primary/60 ml-1">（保存中…）</span>}
          </label>
          {hasOverride && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearOverride}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              上書きクリア
            </Button>
          )}
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="イベント固有の説明文（空欄=基本値を使用）"
          className="text-sm min-h-[80px]"
        />
      </div>

      {/* Override resources */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">上書き資料</label>
        {resources.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {resources.map((res, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-md px-2.5 py-1.5 border border-border">
                {res.type === "file" ? (
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-xs flex-1 truncate">{res.label}</span>
                <button
                  onClick={() => handleDeleteResource(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-primary cursor-pointer hover:text-primary/80 w-fit">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "アップロード中…" : "ファイル追加"}
            <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
          <div className="flex gap-1.5">
            <Input
              value={urlLabel}
              onChange={(e) => setUrlLabel(e.target.value)}
              placeholder="リンク名"
              className="h-7 text-xs flex-1"
            />
            <Input
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://..."
              className="h-7 text-xs flex-1"
            />
            <Button size="sm" onClick={handleAddUrl} disabled={!urlValue.trim()} className="h-7 px-2 text-xs shrink-0">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}