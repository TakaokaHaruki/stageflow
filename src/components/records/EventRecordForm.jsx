import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { RECORD_CATEGORIES } from "@/lib/eventRecordCategories";
import useSignedUrls from "@/hooks/useSignedUrls";

const MAX_PHOTOS = 8;

export default function EventRecordForm({ eventId, eventName = "", eventDate = "", record = null, onCancel, onSaved }) {
  const [category, setCategory] = useState(record?.category || "その他");
  const [memo, setMemo] = useState(record?.memo || "");
  const [existingUris, setExistingUris] = useState(record?.photo_uris || []);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef();
  const existingUrls = useSignedUrls(existingUris);
  const isEdit = Boolean(record);
  const photoCount = existingUris.length + files.length;

  const addFiles = (e) => {
    const picked = Array.from(e.target.files || []).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...picked].slice(0, Math.max(0, MAX_PHOTOS - existingUris.length)));
    e.target.value = "";
  };

  const removeFile = (index) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!memo.trim() && photoCount === 0) {
      toast.error("メモか写真を追加してください");
      return;
    }
    setSaving(true);
    try {
      const uploaded = await Promise.all(
        files.map(({ file }) => base44.integrations.Core.UploadPrivateFile({ file }))
      );
      const data = {
        event_id: eventId,
        event_name: eventName,
        event_date: eventDate,
        category,
        memo: memo.trim(),
        photo_uris: [...existingUris, ...uploaded.map((res) => res.file_uri).filter(Boolean)],
      };
      await onSaved(data);
      if (!isEdit) {
        files.forEach(({ preview }) => URL.revokeObjectURL(preview));
        setMemo("");
        setFiles([]);
        setExistingUris([]);
        setCategory("その他");
      }
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2.5 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold">{isEdit ? "記録を編集" : "記録を追加"}</p>
        {isEdit && (
          <button onClick={onCancel} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="編集をやめる">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {RECORD_CATEGORIES.map(({ name, icon: Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => setCategory(name)}
            className={`flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors ${
              category === name
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Icon className="h-3 w-3" />
            {name}
          </button>
        ))}
      </div>

      <Textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="気づいたこと・申し送り事項などを記録"
        className="min-h-[76px] text-sm"
      />

      {(existingUris.length > 0 || files.length > 0) && (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {existingUris.map((uri) => (
            <div key={uri} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              {existingUrls[uri] && <img src={existingUrls[uri]} alt="添付写真" className="h-full w-full object-cover" />}
              <button
                type="button"
                onClick={() => setExistingUris((prev) => prev.filter((u) => u !== uri))}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-1 text-white"
                aria-label="写真を削除"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {files.map(({ preview }, index) => (
            <div key={preview} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              <img src={preview} alt="追加する写真" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-1 text-white"
                aria-label="写真を削除"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input type="file" accept="image/*" multiple ref={fileInputRef} className="hidden" onChange={addFiles} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={photoCount >= MAX_PHOTOS}
        >
          <Camera className="h-3.5 w-3.5" />
          写真を選択（{photoCount}/{MAX_PHOTOS}）
        </Button>
        <Button size="sm" className="ml-auto h-8 gap-1 text-xs" onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "保存" : "投稿する"}
        </Button>
      </div>
    </div>
  );
}