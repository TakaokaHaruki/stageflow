import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ModalShell, { ModalHeader, ModalFooter } from "@/components/ModalShell";
import SaveMethodHint from "@/components/SaveMethodHint";
import { resolveSections, newSectionId } from "@/lib/meetingSheetSections";
import { getJstNow } from "@/lib/accessTracker";
import MeetingSectionList from "@/components/MeetingSectionList";

// テンプレート編集（管理者用）
export default function MeetingSheetTemplateEditor({ template, onSave, onCancel, saving }) {
  const [name, setName] = useState("");
  const [sections, setSections] = useState([]);

  useEffect(() => {
    if (template) {
      setName(template.name || "");
      setSections(resolveSections(template));
    } else {
      setName("");
      setSections([
        { id: newSectionId(), label: "チケット関係", content: "" },
        { id: newSectionId(), label: "グッズ販売", content: "" },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), sections, updated_at_jst: getJstNow() });
  };

  return (
    <ModalShell onClose={onCancel} maxWidth="max-w-3xl">
      <ModalHeader title={template ? "テンプレートを編集" : "テンプレートを新規作成"} onClose={onCancel} />
      <div className="mb-3">
        <SaveMethodHint mode="explicit" />
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="tpl_name">テンプレート名</Label>
          <Input id="tpl_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 標準ミーティング用紙" />
        </div>
        <div className="space-y-1">
          <Label>本文セクション</Label>
          <p className="text-xs text-muted-foreground">項目のタイトル・順序・追加・削除、本文のリッチテキスト編集ができます。この構成が用紙へ適用されます。</p>
          <MeetingSectionList
            sections={sections}
            onChange={setSections}
            addLabel="項目を追加"
            emptyLabel="新規項目"
          />
        </div>
      </div>
      <ModalFooter>
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>キャンセル</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !name.trim()}>{saving ? "保存中…" : "保存"}</Button>
      </ModalFooter>
    </ModalShell>
  );
}