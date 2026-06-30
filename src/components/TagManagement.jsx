import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Tag, Shield } from "lucide-react";
import { useCaptureTags } from "@/hooks/useCaptureTags";
import { STAFF_ROLES, getRoleBadgeClass } from "@/lib/staffRoles";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import SectionHeader from "@/components/SectionHeader";

export default function TagManagement() {
  const { canManageSettings } = useUserRole();
  const { tags, saveTags } = useCaptureTags();
  const [input, setInput] = useState("");

  const addMutation = useMutation({
    mutationFn: async (nextTags) => saveTags(nextTags),
    onSuccess: () => { setInput(""); toast.success("タグを追加しました"); },
    onError: () => toast.error("追加に失敗しました"),
  });

  const removeMutation = useMutation({
    mutationFn: async (nextTags) => saveTags(nextTags),
    onSuccess: () => toast.success("タグを削除しました"),
    onError: () => toast.error("削除に失敗しました"),
  });

  const handleAdd = () => {
    const t = input.trim();
    if (!t || tags.includes(t)) return;
    addMutation.mutate([...tags, t]);
  };

  const handleRemove = (tag) => {
    removeMutation.mutate(tags.filter((t) => t !== tag));
  };

  return (
    <div>
      <SectionHeader
        icon={Tag}
        title="タグ・役割管理"
        subtitle="捕まりタグのマスターリストを管理します。スタッフ編集時に選択肢として表示されます。役割は固定です。"
      />

      {/* 役割セクション */}
      <div className="bg-card border border-border rounded-xl p-3 mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="text-xs font-bold">役割（固定）</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STAFF_ROLES.map((role) => (
            <span key={role} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeClass(role)}`}>
              {role}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">役割はシステム固定のリストです。編集できません。</p>
      </div>

      {/* 捕まりタグセクション */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="text-xs font-bold">捕まりタグ</h3>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.length === 0 && (
            <p className="text-xs text-muted-foreground">タグが登録されていません</p>
          )}
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-medium">
              {tag}
              {canManageSettings && (
                <button onClick={() => handleRemove(tag)} className="ml-0.5 hover:text-destructive transition-colors" aria-label="削除">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        {canManageSettings && (
          <div className="flex gap-1.5 mt-1.5">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); handleAdd(); } }}
              placeholder="新しいタグ名"
              className="h-7 text-xs flex-1"
            />
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-0.5" onClick={handleAdd} disabled={!input.trim() || addMutation.isPending}>
              <Plus className="w-3 h-3" />追加
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}