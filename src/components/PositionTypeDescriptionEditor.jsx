import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, FileText, ExternalLink, Upload, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function PositionTypeDescriptionEditor({ positionType, isAdmin, alwaysOpen = false }) {
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState(positionType.description || "");
  const [resources, setResources] = useState(positionType.resources || []);
  const [urlLabel, setUrlLabel] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const descRef = useRef(positionType.description || "");
  const resRef = useRef(positionType.resources || []);
  const queryClient = useQueryClient();

  // Sync from external changes
  useEffect(() => {
    setDescription(positionType.description || "");
    setResources(positionType.resources || []);
    descRef.current = positionType.description || "";
    resRef.current = positionType.resources || [];
  }, [positionType.id]);

  const save = async (newDesc, newRes) => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await base44.functions.invoke("updatePositionTypeRecord", {
        action: "update",
        id: positionType.id,
        data: { description: newDesc, resources: newRes },
      });
      queryClient.invalidateQueries({ queryKey: ["positionTypes"] });
      descRef.current = newDesc;
      resRef.current = newRes;
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // Debounced description save
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

  const editorContent = (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
      {saving && <span className="text-[10px] text-primary/60">保存中…</span>}
      </div>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={!isAdmin}
        placeholder="基本説明文（全イベント共通）"
        className="text-xs min-h-[60px]"
      />

      {/* Resources list */}
      {resources.length > 0 && (
        <div className="space-y-1">
          {resources.map((res, idx) => (
            <div key={idx} className="flex items-center gap-1.5 bg-muted/40 rounded-md px-2 py-1">
              {res.type === "file" ? (
                <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
              ) : (
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
              <span className="text-[11px] flex-1 truncate">{res.label}</span>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteResource(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin ? (
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-primary cursor-pointer hover:text-primary/80">
            <Upload className="w-3 h-3" />
            {uploading ? "アップロード中…" : "ファイル追加"}
            <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
          <div className="flex gap-1">
            <Input
              value={urlLabel}
              onChange={(e) => setUrlLabel(e.target.value)}
              placeholder="リンク名"
              className="h-6 text-[11px] flex-1"
            />
            <Input
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://..."
              className="h-6 text-[11px] flex-1"
            />
            <Button size="sm" onClick={handleAddUrl} disabled={!urlValue.trim()} className="h-6 px-2 text-[10px] shrink-0">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        !description && resources.length === 0 && (
          <p className="text-[10px] text-muted-foreground/50 text-center py-2">共通説明はまだ設定されていません</p>
        )
      )}
    </div>
  );

  if (alwaysOpen) {
    return editorContent;
  }

  return (
    <div className="mt-1.5 pl-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <motion.span animate={{ rotate: expanded ? 0 : -90 }} transition={{ duration: 0.15 }}>
          <ChevronDown className="w-3 h-3" />
        </motion.span>
        説明・資料{saving && <span className="text-primary/60">（保存中…）</span>}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {editorContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}