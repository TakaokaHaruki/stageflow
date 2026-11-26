import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import ModalShell, { ModalHeader, ModalFooter } from "@/components/ModalShell";
import { TIME_FIELDS, TIME_NOTE_FIELD, resolveSections, templateToSections } from "@/lib/meetingSheetSections";
import { getJstNow } from "@/lib/accessTracker";
import MeetingSectionList from "@/components/MeetingSectionList";
import MeetingSheetTemplatePicker from "@/components/MeetingSheetTemplatePicker";

// イベントの開始/終了時刻から「HH:MM-HH:MM」形式の文字列を生成
function buildTimeRange(start, end) {
  if (start && end) return `${start}-${end}`;
  if (start) return `${start}-`;
  if (end) return `-${end}`;
  return "";
}

function timeDefaultsFromEvent(eventTimes = {}) {
  return {
    time_priority: buildTimeRange(eventTimes.time_priority, eventTimes.time_priority_end),
    time_open: buildTimeRange(eventTimes.time_open, eventTimes.time_open_end),
    time_start: buildTimeRange(eventTimes.time_start, eventTimes.time_start_end),
    time_end: buildTimeRange(eventTimes.time_end, eventTimes.time_end_end),
  };
}

function toForm(sheet) {
  if (!sheet) return null;
  return {
    title: sheet.title ?? "",
    event_name: sheet.event_name ?? "",
    event_date: sheet.event_date ?? "",
    venue: sheet.venue ?? "",
    chief_name: sheet.chief_name ?? "",
    cloak_name: sheet.cloak_name ?? "",
    time_priority: sheet.time_priority ?? "",
    time_open: sheet.time_open ?? "",
    time_start: sheet.time_start ?? "",
    time_end: sheet.time_end ?? "",
    time_note: sheet.time_note ?? "",
    sections: resolveSections(sheet),
    applied_template_id: sheet.applied_template_id ?? "",
  };
}

const EMPTY_FORM = {
  title: "",
  event_name: "",
  event_date: "",
  venue: "",
  chief_name: "",
  cloak_name: "",
  time_priority: "",
  time_open: "",
  time_start: "",
  time_end: "",
  time_note: "",
  sections: [],
  applied_template_id: "",
};

export default function MeetingSheetEditor({ sheet, eventName, eventDate, venue, eventChief, eventCloak, eventTimes, onSave, onCancel, saving }) {
  const [form, setForm] = useState(() => toForm(sheet) || { ...EMPTY_FORM });
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    // 新規作成時はイベント情報とタイムスケジュールを初期値として補完
    if (!sheet) {
      const timeDefaults = timeDefaultsFromEvent(eventTimes);
      setForm((prev) => ({
        ...prev,
        event_name: prev.event_name || eventName || "",
        event_date: prev.event_date || eventDate || "",
        venue: prev.venue || venue || "",
        chief_name: prev.chief_name || eventChief || "",
        cloak_name: prev.cloak_name || eventCloak || "",
        time_priority: prev.time_priority || timeDefaults.time_priority || "",
        time_open: prev.time_open || timeDefaults.time_open || "",
        time_start: prev.time_start || timeDefaults.time_start || "",
        time_end: prev.time_end || timeDefaults.time_end || "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, eventName, eventDate, venue, eventChief, eventCloak, eventTimes]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleApplyTemplate = (template) => {
    setForm((prev) => ({
      ...prev,
      sections: templateToSections(template),
      applied_template_id: template.id,
    }));
    setPickerOpen(false);
  };

  const handleSave = () => {
    if (!form.event_name && !form.title) {
      setError("公演名またはタイトルを入力してください");
      return;
    }
    setError("");
    onSave({
      ...form,
      event_date: form.event_date || undefined,
      updated_at_jst: getJstNow(),
    });
  };

  return (
    <ModalShell onClose={onCancel} maxWidth="max-w-3xl">
      <ModalHeader title={sheet ? "ミーティング用紙を編集" : "ミーティング用紙を新規作成"} onClose={onCancel} />
      <div className="space-y-3">
        {/* ヘッダー情報 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="title">用紙タイトル</Label>
            <Input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="ミーティング用紙" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="event_name">公演名</Label>
            <Input id="event_name" value={form.event_name} onChange={(e) => update("event_name", e.target.value)} placeholder="例: 絢香 20th ANNIVERSARY LIVE TOUR" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="event_date">日程</Label>
            <Input id="event_date" type="date" value={form.event_date} onChange={(e) => update("event_date", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="venue">会場</Label>
            <Input id="venue" value={form.venue} onChange={(e) => update("venue", e.target.value)} placeholder="例: iichikoグランシアタ" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="chief_name">チーフ</Label>
            <Input id="chief_name" value={form.chief_name} onChange={(e) => update("chief_name", e.target.value)} placeholder="配置表PDFヘッダー用チーフ名" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cloak_name">クローク</Label>
            <Input id="cloak_name" value={form.cloak_name} onChange={(e) => update("cloak_name", e.target.value)} placeholder="配置表PDFヘッダー用クローク名" />
          </div>
        </div>

        {/* タイムスケジュール：横一列表形式 */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <h3 className="text-sm font-bold text-primary">タイムスケジュール</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-border">
                  {TIME_FIELDS.map((f) => (
                    <th key={f.key} className="px-2 py-1.5 text-xs font-semibold text-primary text-left border-r border-border last:border-r-0 bg-primary/5">{f.label}</th>
                  ))}
                </tr>
                <tr>
                  {TIME_FIELDS.map((f) => (
                    <td key={f.key} className="px-1 py-1 border-r border-border last:border-r-0">
                      <Input value={form[f.key]} onChange={(e) => update(f.key, e.target.value)} placeholder={f.placeholder} className="h-8 text-xs" />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{TIME_NOTE_FIELD.label}</Label>
            <Textarea rows={2} value={form[TIME_NOTE_FIELD.key]} onChange={(e) => update(TIME_NOTE_FIELD.key, e.target.value)} placeholder="例: 全て予定時間です。お客さまへの説明の時は語尾を濁してください。" />
          </div>
        </div>

        {/* 本文セクション */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary">本文</h3>
            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
              <Sparkles className="h-3.5 w-3.5" />テンプレートを適用
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">項目のタイトル編集・並べ替え・追加・削除ができます。入力欄のツールバーで太字・文字色・箇条書きを編集できます。</p>
          <MeetingSectionList
            sections={form.sections}
            onChange={(s) => update("sections", s)}
            addLabel="項目を追加"
            emptyLabel="新規項目"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <ModalFooter>
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>キャンセル</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
      </ModalFooter>

      {pickerOpen && (
        <MeetingSheetTemplatePicker onApply={handleApplyTemplate} onCancel={() => setPickerOpen(false)} />
      )}
    </ModalShell>
  );
}