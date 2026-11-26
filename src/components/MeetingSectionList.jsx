import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import { newSectionId } from "@/lib/meetingSheetSections";

// 順序変更・タイトル編集・追加・削除が可能な本文セクションリスト
// sections: [{id, label, content}]
export default function MeetingSectionList({ sections, onChange, addLabel = "項目を追加", emptyLabel = "新規項目" }) {
  const update = (id, patch) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const remove = (id) => onChange(sections.filter((s) => s.id !== id));
  const move = (idx, dir) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(idx, 1);
    next.splice(ni, 0, item);
    onChange(next);
  };
  const add = () => {
    onChange([...sections, { id: newSectionId(), label: emptyLabel, content: "" }]);
  };

  return (
    <div className="space-y-3">
      {sections.map((sec, idx) => (
        <div key={sec.id} className="rounded-lg border border-border bg-card p-2 shadow-card">
          <div className="flex items-center gap-1.5 mb-1.5">
            <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            <Input
              value={sec.label}
              onChange={(e) => update(sec.id, { label: e.target.value })}
              placeholder="項目名"
              className="h-8 text-sm font-semibold flex-1"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(idx, -1)} disabled={idx === 0} title="上へ">
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(idx, 1)} disabled={idx === sections.length - 1} title="下へ">
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(sec.id)} title="削除">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <RichTextEditor
            value={sec.content}
            onChange={(v) => update(sec.id, { content: v })}
            placeholder={`${sec.label || "本文"}を入力`}
            minHeight={64}
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="h-4 w-4" />{addLabel}
      </Button>
    </div>
  );
}