import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Trash2, Save, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

const KEYS = {
  TEXT: "portal_login_help_text",
  PDF_URL: "portal_login_help_pdf_url",
  PDF_NAME: "portal_login_help_pdf_name",
};

export default function LoginHelpManager() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [configIds, setConfigIds] = useState({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: configs = [] } = useQuery({
    queryKey: ["appConfig", "login_help"],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  useEffect(() => {
    if (!configs.length || initialized) return;
    const ids = {};
    for (const c of configs) {
      if (c.key === KEYS.TEXT) {
        setText(c.value || "");
        ids[KEYS.TEXT] = c.id;
      } else if (c.key === KEYS.PDF_URL) {
        setPdfUrl(c.value || "");
        ids[KEYS.PDF_URL] = c.id;
      } else if (c.key === KEYS.PDF_NAME) {
        setPdfName(c.value || "");
        ids[KEYS.PDF_NAME] = c.id;
      }
    }
    setConfigIds(ids);
    setInitialized(true);
  }, [configs, initialized]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("PDFファイルのみアップロードできます");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPdfUrl(file_url);
      setPdfName(file.name);
      toast.success("ファイルをアップロードしました");
    } catch {
      toast.error("アップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeletePdf = () => {
    setPdfUrl("");
    setPdfName("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: KEYS.TEXT, value: text },
        { key: KEYS.PDF_URL, value: pdfUrl },
        { key: KEYS.PDF_NAME, value: pdfName },
      ];
      const newIds = { ...configIds };
      for (const { key, value } of updates) {
        if (newIds[key]) {
          await base44.entities.AppConfig.update(newIds[key], { value });
        } else {
          const created = await base44.entities.AppConfig.create({ key, value });
          newIds[key] = created.id;
        }
      }
      setConfigIds(newIds);
      queryClient.invalidateQueries({ queryKey: ["appConfig", "login_help"] });
      toast.success("保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold">ログイン案内</h3>
          <p className="text-xs text-muted-foreground">
            スタッフポータルのログイン画面に表示する案内バナーを設定します
          </p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">テキスト説明文（任意）</label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例：A-CAST IDのQRコードをアップロードしてログインしてください。"
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          バナー展開時に表示される説明文です
        </p>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">案内PDF（任意）</label>
        {pdfUrl ? (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm flex-1 truncate">{pdfName || "PDFファイル"}</span>
            <Button variant="ghost" size="sm" onClick={handleDeletePdf} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/30 transition-colors">
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{uploading ? "アップロード中..." : "PDFファイルを選択"}</span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          「ログインでお困りの方はこちら」ボタンから表示されるPDFです
        </p>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
        ※ テキスト説明文のみでもバナーは表示されます。PDF未設定時は「ログインでお困りの方はこちら」ボタンが非表示になります。両方未設定の場合はバナー自体が非表示になります。
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />保存中...</> : <><Save className="w-4 h-4" />保存</>}
      </Button>
    </div>
  );
}