import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Save, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function EventSheetEditor({ eventId }) {
  const queryClient = useQueryClient();
  const [customNotes, setCustomNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch existing sheet data
  const { data: sheets = [], isLoading } = useQuery({
    queryKey: ["eventSheet", eventId],
    queryFn: () => base44.entities.EventSheet.filter({ event_id: eventId }),
  });

  useEffect(() => {
    if (sheets && sheets.length > 0) {
      setCustomNotes(sheets[0].custom_notes || "");
    }
  }, [sheets]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (sheets && sheets.length > 0) {
        return base44.entities.EventSheet.update(sheets[0].id, data);
      } else {
        return base44.entities.EventSheet.create({ event_id: eventId, ...data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventSheet", eventId] });
      toast.success("公演シートを保存しました");
    },
    onError: (error) => {
      toast.error(`保存に失敗しました：${error.message}`);
    }
  });

  const handleSave = () => {
    saveMutation.mutate({ custom_notes: customNotes });
  };

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const response = await base44.functions.invoke('exportEventSheetPDF', { eventId });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Fetch event name for filename
      const event = await base44.entities.Event.get(eventId);
      link.download = `${event.name}_公演シート.pdf`;
      
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("PDF をダウンロードしました");
    } catch (error) {
      toast.error(`PDF 生成に失敗しました：${error.message}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            公演シート編集
          </CardTitle>
          <CardDescription>
            PDF 出力用の注意事項を編集します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customNotes">注意事項</Label>
            <Textarea
              id="customNotes"
              placeholder="スタッフへの注意事項を記載"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={8}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saveMutation.isPending || isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "保存中..." : "保存"}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingPDF ? "生成中..." : "PDF ダウンロード"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}