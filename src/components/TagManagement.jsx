import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Tag, Shield, LayoutGrid } from "lucide-react";
import { useCaptureTags } from "@/hooks/useCaptureTags";
import { useAllRoles } from "@/hooks/useAllRoles";
import { usePositionCategories } from "@/hooks/usePositionCategories";
import { STAFF_ROLES, getRandomColorKey, CUSTOM_ROLE_COLOR_PRESETS, getRoleBadgeClass } from "@/lib/staffRoles";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import SectionHeader from "@/components/SectionHeader";

export default function TagManagement() {
  const { canManageSettings } = useUserRole();
  const { tags, saveTags } = useCaptureTags();
  const { allRoles, customRoles, saveRoles } = useAllRoles();
  const { categories, saveCategories } = usePositionCategories();

  const [tagInput, setTagInput] = useState("");
  const [roleInput, setRoleInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");

  // --- 捕まりタグ ---
  const tagAddMutation = useMutation({
    mutationFn: async (nextTags) => saveTags(nextTags),
    onSuccess: () => { setTagInput(""); toast.success("タグを追加しました"); },
    onError: () => toast.error("追加に失敗しました"),
  });
  const tagRemoveMutation = useMutation({
    mutationFn: async (nextTags) => saveTags(nextTags),
    onSuccess: () => toast.success("タグを削除しました"),
    onError: () => toast.error("削除に失敗しました"),
  });
  const handleAddTag = () => {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    tagAddMutation.mutate([...tags, t]);
  };
  const handleRemoveTag = (tag) => {
    tagRemoveMutation.mutate(tags.filter((t) => t !== tag));
  };

  // --- 役割（カスタム） ---
  const roleAddMutation = useMutation({
    mutationFn: async (nextRoles) => saveRoles(nextRoles),
    onSuccess: () => { setRoleInput(""); toast.success("役割を追加しました"); },
    onError: () => toast.error("追加に失敗しました"),
  });
  const roleRemoveMutation = useMutation({
    mutationFn: async (nextRoles) => saveRoles(nextRoles),
    onSuccess: () => toast.success("役割を削除しました"),
    onError: () => toast.error("削除に失敗しました"),
  });
  const handleAddRole = () => {
    const r = roleInput.trim();
    if (!r || allRoles.some((role) => role.name === r)) return;
    const colorKey = getRandomColorKey();
    roleAddMutation.mutate([...customRoles, { name: r, color: colorKey }]);
  };
  const handleRemoveRole = (roleName) => {
    roleRemoveMutation.mutate(customRoles.filter((r) => r.name !== roleName));
  };

  // --- ポジション属性 ---
  const categoryAddMutation = useMutation({
    mutationFn: async (nextCats) => saveCategories(nextCats),
    onSuccess: () => { setCategoryInput(""); toast.success("属性を追加しました"); },
    onError: () => toast.error("追加に失敗しました"),
  });
  const categoryRemoveMutation = useMutation({
    mutationFn: async (nextCats) => saveCategories(nextCats),
    onSuccess: () => toast.success("属性を削除しました"),
    onError: () => toast.error("削除に失敗しました"),
  });
  const handleAddCategory = () => {
    const c = categoryInput.trim();
    if (!c || categories.includes(c)) return;
    categoryAddMutation.mutate([...categories, c]);
  };
  const handleRemoveCategory = (cat) => {
    categoryRemoveMutation.mutate(categories.filter((c) => c !== cat));
  };

  return (
    <div>
      <SectionHeader
        icon={Tag}
        title="タグ・役割・属性管理"
        subtitle="捕まりタグ・役割・ポジション属性のマスターリストを一元管理します。"
      />

      {/* 役割セクション */}
      <div className="bg-card border border-border rounded-xl p-3 mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="text-xs font-bold">役割</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STAFF_ROLES.map((role) => (
            <span key={role} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeClass(role)}`}>
              {role}
            </span>
          ))}
          {customRoles.map((role) => (
            <span key={role.name} className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeClass(role.name, role.color)}`}>
              {role.name}
              {canManageSettings && (
                <button onClick={() => handleRemoveRole(role.name)} className="ml-0.5 hover:text-destructive transition-colors" aria-label="削除">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        {canManageSettings && (
          <div className="flex gap-1.5 mt-2">
            <Input
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); handleAddRole(); } }}
              placeholder="新しい役割名（色は自動割り当て）"
              className="h-7 text-xs flex-1"
            />
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-0.5" onClick={handleAddRole} disabled={!roleInput.trim() || roleAddMutation.isPending}>
              <Plus className="w-3 h-3" />追加
            </Button>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-1.5">
          固定役割（インカム・セクションチーフ・バラシ）は削除できません。カスタム役割には追加時に7色からランダムで色が割り当てられます。
        </p>
      </div>

      {/* ポジション属性セクション */}
      <div className="bg-card border border-border rounded-xl p-3 mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="text-xs font-bold">ポジション属性</h3>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground">属性が登録されていません</p>
          )}
          {categories.map((cat) => (
            <span key={cat} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-medium">
              {cat}
              {canManageSettings && (
                <button onClick={() => handleRemoveCategory(cat)} className="ml-0.5 hover:text-destructive transition-colors" aria-label="削除">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        {canManageSettings && (
          <div className="flex gap-1.5 mt-1.5">
            <Input
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); handleAddCategory(); } }}
              placeholder="新しい属性名"
              className="h-7 text-xs flex-1"
            />
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-0.5" onClick={handleAddCategory} disabled={!categoryInput.trim() || categoryAddMutation.isPending}>
              <Plus className="w-3 h-3" />追加
            </Button>
          </div>
        )}
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
                <button onClick={() => handleRemoveTag(tag)} className="ml-0.5 hover:text-destructive transition-colors" aria-label="削除">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        {canManageSettings && (
          <div className="flex gap-1.5 mt-1.5">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); handleAddTag(); } }}
              placeholder="新しいタグ名"
              className="h-7 text-xs flex-1"
            />
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-0.5" onClick={handleAddTag} disabled={!tagInput.trim() || tagAddMutation.isPending}>
              <Plus className="w-3 h-3" />追加
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}