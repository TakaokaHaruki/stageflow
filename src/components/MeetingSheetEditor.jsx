import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ModalShell, { ModalHeader, ModalFooter } from "@/components/ModalShell";
import { TIME_FIELDS, TIME_NOTE_FIELD, MEETING_SECTIONS } from "@/lib/meetingSheetSections";
import { getJstNow } from "@/lib/accessTracker";

// イベントの開始/終了時刻から「HH:MM-HH:MM」形式の文字列を生成
function buildTimeRange(start, end) {
  if (start && end) return `${start}-${end}`;
  if (start) return `${start}-`;
  if (end) return `-${end}`;
  return "";
}

// イベント時刻 → ミーティング用紙のタイムスケジュール項目へマッピング
function timeDefaultsFromEvent(eventTimes = {}) {
  return {
    time_priority: buildTimeRange(eventTimes.time_priority, eventTimes.time_priority_end),
    time_open: buildTimeRange(eventTimes.time_open, eventTimes.time_open_end),
    time_start: buildTimeRange(eventTimes.time_start, eventTimes.time_start_end),
    time_end: buildTimeRange(eventTimes.time_end, eventTimes.time_end_end),
  };
}

const EMPTY_FORM = {
  title: "",
  event_name: "",
  event_date: "",
  venue: "",
  ...Object.fromEntries([...TIME_FIELDS, TIME_NOTE_FIELD, ...MEETING_SECTIONS].map((f) => [f.key, ""])),
};

function toForm(sheet) {
  if (!sheet) return { ...EMPTY_FORM };
  const picked = {};
  [...TIME_FIELDS, TIME_NOTE_FIELD, ...MEETING_SECTIONS].forEach((f) => {
    picked[f.key] = sheet[f.key] ?? "";
  });
  return {
    title: sheet.title ?? "",
    event_name: sheet.event_name ?? "",
    event_date: sheet.event_date ?? "",
    venue: sheet.venue ?? "",
    ...picked,
  };
}

export default function MeetingSheetEditor({ sheet, eventName, eventDate, venue, eventTimes, onSave, onCancel, saving }) {
  const [form, setForm] = useState(() => toForm(sheet));
  const [error, setError] = useState("");

  useEffect(() => {
    // 新規作成時はイベント情報とタイムスケジュールを初期値として補完
    if (!sheet) {
      const timeDefaults = timeDefaultsFromEvent(eventTimes);
      setForm((prev) => ({
        ...prev,
        event_name: prev.event_name || eventName || "",
        event_date: prev.event_date || eventDate || "",
        venue: prev.venue || venue || "",
        time_priority: prev.time_priority || timeDefaults.time_priority || "",
        time_open: prev.time_open || timeDefaults.time_open || "",
        time_start: prev.time_start || timeDefaults.time_start || "",
        time_end: prev.time_end || timeDefaults.time_end || "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, eventName, eventDate, venue, eventTimes]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

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
    <ModalShell onClose={onCancel} maxWidth="max-w-2xl">
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
        </div>

        {/* タイムスケジュール */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <h3 className="text-sm font-bold text-primary">タイムスケジュール</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIME_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input value={form[f.key]} onChange={(e) => update(f.key, e.target.value)} placeholder={f.placeholder} />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{TIME_NOTE_FIELD.label}</Label>
            <Textarea rows={2} value={form[TIME_NOTE_FIELD.key]} onChange={(e) => update(TIME_NOTE_FIELD.key, e.target.value)} placeholder="例: 全て予定時間です。お客さまへの説明の時は語尾を濁してください。" />
          </div>
        </div>

        {/* 各項目 */}
        <div className="space-y-3">
          {MEETING_SECTIONS.map((sec) => (
            <div key={sec.key} className="space-y-1">
              <Label className="text-sm font-semibold">{sec.label}</Label>
              <Textarea rows={3} value={form[sec.key]} onChange={(e) => update(sec.key, e.target.value)} placeholder={`${sec.label}の内容を入力`} />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <ModalFooter>
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>キャンセル</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
      </ModalFooter>
    </ModalShell>
  );
}