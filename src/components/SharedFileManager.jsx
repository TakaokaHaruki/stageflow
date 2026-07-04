import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Plus, Trash2, Pencil, Download, X, FileText, Upload, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import SectionHeader from "@/components/SectionHeader";

const ROLE_OPTIONS = [
  { value: "admin", label: "管理者" },
  { value: "chief", label: "チーフ" },
  { value: "user", label: "一般ユーザー" },
];

const VISIBILITY_BADGES = {
  public: { label: "全員公開", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700" },
  roles: { label: "ロール指定", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700" },
  staff_names: { label: "ユーザー指定", className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700" },
  user_names: { label: "ユーザー指定", className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700" },
};

function getUserLabel(u) {
  return u.full_name || u.email || u.id;
}

function isFileVisible(file, currentUser) {
  if (file.visibility === "public") return true;
  if (!currentUser) return false;
  if (file.created_by_id === currentUser.id) return true;
  if (file.visibility === "roles") {
    return (file.allowed_roles || []).includes(currentUser.role);
  }
  // staff_names / user_names: check if currentUser's full_name or email is in allowed_staff_names
  if (file.visibility === "staff_names" || file.visibility === "user_names") {
    const allowed = file.allowed_staff_names || [];
    const myLabel = currentUser.full_name || currentUser.email;
    return allowed.includes(myLabel);
  }
  return false;
}

// Inline visibility quick-change panel
function VisibilityPanel({ file, users, onSave, onClose }) {
  const [visibility, setVisibility] = useState(file.visibility || "public");
  const [allowedRoles, setAllowedRoles] = useState(file.allowed_roles || []);
  const [allowedUserNames, setAllowedUserNames] = useState(file.allowed_staff_names || []);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose]);

  const toggleRole = (r) =>
    setAllowedRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);

  const toggleUser = (name) =>
    setAllowedUserNames((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      visibility,
      allowed_roles: visibility === "roles" ? allowedRoles : [],
      allowed_staff_names: visibility === "staff_names" || visibility === "user_names" ? allowedUserNames : [],
    });
    setSaving(false);
    onClose();
  };

  return (
    <div
      ref={panelRef}
      className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-2xl p-3 w-64 space-y-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[11px] font-semibold text-muted-foreground">公開範囲を変更</p>

      <div className="flex gap-1.5 flex-wrap">
        {[
          { value: "public", label: "全員公開" },
          { value: "roles", label: "ロール指定" },
          { value: "staff_names", label: "ユーザー指定" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setVisibility(opt.value)}
            className={`px-2.5 py-1 rounded-full text-xs border font-medium transition-colors min-h-[32px] ${
              visibility === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {visibility === "roles" && (
        <div className="space-y-1">
          {ROLE_OPTIONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer min-h-[32px]">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={allowedRoles.includes(r.value)}
                onChange={() => toggleRole(r.value)}
              />
              <span className="text-xs">{r.label}</span>
            </label>
          ))}
        </div>
      )}

      {(visibility === "staff_names" || visibility === "user_names") && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {(users || []).map((u) => {
            const label = getUserLabel(u);
            return (
              <label key={u.id} className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={allowedUserNames.includes(label)}
                  onChange={() => toggleUser(label)}
                />
                <span className="text-xs truncate">{label}</span>
              </label>
            );
          })}
        </div>
      )}

      <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        保存
      </Button>
    </div>
  );
}

function FileFormModal({ eventId, users, file, onClose, onSaved }) {
  const [title, setTitle] = useState(file?.title || "");
  const [description, setDescription] = useState(file?.description || "");
  const [visibility, setVisibility] = useState(file?.visibility || "public");
  const [allowedRoles, setAllowedRoles] = useState(file?.allowed_roles || []);
  const [allowedUserNames, setAllowedUserNames] = useState(file?.allowed_staff_names || []);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const isEdit = Boolean(file);

  const toggleRole = (role) =>
    setAllowedRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);

  const toggleUser = (name) =>
    setAllowedUserNames((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("タイトルを入力してください"); return; }
    if (!isEdit && !selectedFile) { toast.error("ファイルを選択してください"); return; }
    setUploading(true);
    let file_url = file?.file_url;
    let file_name = file?.file_name;
    if (selectedFile) {
      const result = await base44.integrations.Core.UploadFile({ file: selectedFile });
      file_url = result.file_url;
      file_name = selectedFile.name;
    }
    const data = {
      event_id: eventId,
      title: title.trim(),
      description: description.trim(),
      file_url,
      file_name,
      visibility,
      allowed_roles: visibility === "roles" ? allowedRoles : [],
      allowed_staff_names: visibility === "staff_names" || visibility === "user_names" ? allowedUserNames : [],
    };
    await onSaved(data);
    setUploading(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">{isEdit ? "ファイルを編集" : "ファイルを追加"}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル（必須）" className="h-8 text-sm" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="説明（任意）" className="h-8 text-sm" />
        </div>

        {!isEdit && (
          <div>
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            <Button size="sm" variant="outline" className="w-full gap-1.5 h-8 text-xs" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" />
              {selectedFile ? selectedFile.name : "ファイルを選択"}
            </Button>
          </div>
        )}

        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">公開範囲</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "public", label: "全員公開" },
              { value: "roles", label: "ロール指定" },
              { value: "staff_names", label: "ユーザー指定" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs border font-medium transition-colors ${
                  visibility === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:bg-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {visibility === "roles" && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">対象ロール（複数選択可）</p>
            <div className="flex gap-2 flex-wrap">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => toggleRole(r.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border font-medium transition-colors ${
                    allowedRoles.includes(r.value)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-muted text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(visibility === "staff_names" || visibility === "user_names") && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">対象ユーザー（複数選択可）</p>
            <div className="flex gap-1.5 flex-wrap max-h-32 overflow-y-auto">
              {(users || []).map((u) => {
                const label = getUserLabel(u);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(label)}
                    className={`px-2 py-0.5 rounded-full text-[11px] border font-medium transition-colors ${
                      allowedUserNames.includes(label)
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-muted text-muted-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={uploading} size="sm" className="w-full gap-1.5 h-8">
          {uploading ? "アップロード中..." : isEdit ? "保存" : "追加"}
        </Button>
      </div>
    </div>
  );
}

export default function SharedFileManager({ eventId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openPanelId, setOpenPanelId] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {}).finally(() => setUserLoading(false));
  }, []);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["sharedFiles", eventId],
    queryFn: () => base44.entities.SharedFile.filter({ event_id: eventId }, "-created_date"),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SharedFile.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sharedFiles", eventId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SharedFile.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sharedFiles", eventId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SharedFile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sharedFiles", eventId] }),
  });

  const visibleFiles = files.filter((f) => isFileVisible(f, currentUser));

  const filteredFiles = visibleFiles.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (f.title || "").toLowerCase().includes(q) ||
      (f.file_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <SectionHeader
        icon={Paperclip}
        title="ファイル共有"
        actions={currentUser && (
          <Button size="sm" className="gap-1 h-8 text-xs px-2" onClick={() => setShowForm(true)}>
            <Plus className="w-3 h-3" />追加
          </Button>
        )}
      />

      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ファイル名で検索..."
          className="h-8 text-sm pl-8 pr-8"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {(isLoading || userLoading) ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Paperclip className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm font-medium">{searchQuery ? "一致するファイルがありません" : "共有ファイルはありません"}</p>
        </div>
      ) : (
        <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {filteredFiles.map((f) => {
            const badge = VISIBILITY_BADGES[f.visibility] || VISIBILITY_BADGES.public;
            const isOwner = currentUser && f.created_by_id === currentUser.id;
            const isPanelOpen = openPanelId === f.id;
            return (
              <div key={f.id} className="bg-card px-3 py-2.5 flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={f.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:text-primary hover:underline flex items-center gap-1 truncate"
                    onClick={() => {}}
                  >
                    {f.title}
                    <Download className="w-3 h-3 shrink-0 opacity-60" />
                  </a>
                  {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <div className="relative">
                      <button
                        onClick={() => isOwner && setOpenPanelId(isPanelOpen ? null : f.id)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${badge.className} ${isOwner ? "cursor-pointer hover:opacity-80 transition-opacity" : "cursor-default"}`}
                      >
                        {badge.label}
                      </button>
                      {isPanelOpen && (
                        <VisibilityPanel
                          file={f}
                          users={users}
                          onSave={(data) => updateMutation.mutateAsync({ id: f.id, data })}
                          onClose={() => setOpenPanelId(null)}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(f.created_date), "M/d HH:mm", { locale: ja })}
                    </span>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingFile(f)}
                      className="p-1 rounded hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(f)}
                      className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <FileFormModal
          eventId={eventId}
          users={users}
          onClose={() => setShowForm(false)}
          onSaved={(data) => createMutation.mutateAsync(data)}
        />
      )}

      {editingFile && (
        <FileFormModal
          eventId={eventId}
          users={users}
          file={editingFile}
          onClose={() => setEditingFile(null)}
          onSaved={(data) => updateMutation.mutateAsync({ id: editingFile.id, data })}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`「${confirmDelete.title}」を削除しますか？`}
          confirmLabel="削除"
          onConfirm={() => { deleteMutation.mutate(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}