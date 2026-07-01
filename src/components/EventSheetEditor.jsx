import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Save, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";

export default function EventSheetEditor({ eventId }) {
  const queryClient = useQueryClient();
  const [sheetData, setSheetData] = useState(null);
  const [customNotes, setCustomNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch event data
  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => base44.entities.Event.get(eventId),
  });

  // Fetch existing sheet data
  const { data: sheets = [] } = useQuery({
    queryKey: ["eventSheet", eventId],
    queryFn: () => base44.entities.EventSheet.filter({ event_id: eventId }),
  });

  useEffect(() => {
    if (sheets && sheets.length > 0) {
      setSheetData(sheets[0]);
      setCustomNotes(sheets[0].custom_notes || "");
    }
  }, [sheets]);

  // Save sheet data
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (sheetData) {
        return base44.entities.EventSheet.update(sheetData.id, data);
      } else {
        return base44.entities.EventSheet.create({ ...data, event_id: eventId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventSheet", eventId] });
      toast.success("公演シートを保存しました");
    },
    onError: (error) => {
      toast.error(`保存に失敗しました：${error.message}`);
    },
  });

  // Generate PDF
  const generatePDFMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("exportEventSheetPDF", {
        event_id: eventId,
      });
      return response.data;
    },
    onSuccess: (pdfData) => {
      if (pdfData?.file_url) {
        const link = document.createElement("a");
        link.href = pdfData.file_url;
        link.download = `公演シート_${event?.name || eventId}.pdf`;
        link.click();
        toast.success("PDF をダウンロードしました");
      }
    },
    onError: (error) => {
      toast.error(`PDF 生成に失敗しました：${error.message}`);
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    saveMutation.mutate(
      { custom_notes: customNotes },
      { onSettled: () => setIsSaving(false) }
    );
  };

  const handleGeneratePDF = () => {
    setIsGeneratingPDF(true);
    generatePDFMutation.mutate(null, { onSettled: () => setIsGeneratingPDF(false) });
  };

  if (!event) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            公演シート設定
          </CardTitle>
          <CardDescription>
            A4 サイズの公演情報シートを編集・出力します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event Info Preview */}
          <div className="rounded-lg border bg-muted p-4 space-y-2">
            <h3 className="font-semibold text-sm">公演情報（自動取得）</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">公演名</span>
                <span className="font-medium">{event.name}</span>
              </div>
              {event.date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">開催日</span>
                  <span>{format(new Date(event.date), "yyyy 年 M 月 d 日（E）", { locale: ja })}</span>
                </div>
              )}
              {event.venue && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">会場</span>
                  <span>{event.venue}</span>
                </div>
              )}
              {event.time_priority && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">先行</span>
                  <span>{event.time_priority} - {event.time_priority_end || "未設定"}</span>
                </div>
              )}
              {event.time_open && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">開場</span>
                  <span>{event.time_open} - {event.time_start || "未設定"}</span>
                </div>
              )}
              {event.time_start && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">開演</span>
                  <span>{event.time_start} - {event.time_end || "未設定"}</span>
                </div>
              )}
              {event.time_end && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">終演</span>
                  <span>{event.time_end} - {event.time_end_end || "未設定"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Custom Notes */}
          <div className="space-y-2">
            <Label htmlFor="custom_notes">注意事項（手動入力）</Label>
            <Textarea
              id="custom_notes"
              placeholder="PDF に記載する注意事項や補足情報を入力してください"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="min-h-[200px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存する
                </>
              )}
            </Button>
            <Button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              variant="outline"
              className="flex-1"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  PDF ダウンロード
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}