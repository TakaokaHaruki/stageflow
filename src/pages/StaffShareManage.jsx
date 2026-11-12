import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, RefreshCw, Ticket, Lightbulb, Utensils, Moon, Check, RotateCcw, Users, Share2, Lock } from "lucide-react";
import { toast } from "sonner";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { formatJaDate } from "@/lib/dateFormat";

// サンプルデータ（バックエンド未接続時の表示用）
const SAMPLE_EVENT = { name: "サンプルコンサート", date: "2026-11-15", venue: "東京ドーム" };
const SAMPLE_STAFF = [
  { id: "s1", name: "佐藤　花子", gender: "女", pass_checked: true, pass_number: "P-001", pass_returned: false, penlight_checked: true, penlight_number: "L-12", penlight_returned: false, bento_day_checked: true, bento_night_checked: false },
  { id: "s2", name: "鈴木　太郎", gender: "男", pass_checked: false, pass_number: "", pass_returned: false, penlight_checked: false, penlight_number: "", penlight_returned: false, bento_day_checked: false, bento_night_checked: false },
  { id: "s3", name: "高橋　美咲", gender: "女", pass_checked: true, pass_number: "P-003", pass_returned: true, penlight_checked: true, penlight_number: "L-05", penlight_returned: true, bento_day_checked: true, bento_night_checked: true },
];

const MANAGEMENT_FIELDS = [
  "pass_checked", "pass_number", "pass_returned",
  "penlight_checked", "penlight_number", "penlight_returned",
  "bento_day_checked", "bento_night_checked",
];

export default function StaffShareManage() {
  const { eventId } = useParams();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [updatingIds, setUpdatingIds] = useState(new Set());

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["share-event", eventId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getStaffListPublic", { eventId });
      return res?.data?.event ?? null;
    },
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const { data: staffList = [], isLoading: staffLoading } = useQuery({
    queryKey: ["share-staff", eventId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getStaffListPublic", { eventId });
      return res?.data?.staff ?? [];
    },
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ staffId, field, value }) => {
      const res = await base44.functions.invoke("updateStaffCheckPublic", { eventId, staffId, field, value });
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data;
    },
    onMutate: async ({ staffId, field, value }) => {
      await queryClient.cancelQueries({ queryKey: ["share-staff", eventId] });
      const prev = queryClient.getQueryData(["share-staff", eventId]);
      queryClient.setQueryData(["share-staff", eventId], (old = []) =>
        old.map((s) => (s.id === staffId ? { ...s, [field]: value } : s))
      );
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["share-staff", eventId], ctx.prev);
      toast.error("更新に失敗しました");
    },
  });

  const handleUpdate = (staffId, field, value) => {
    setUpdatingIds((prev) => new Set(prev).add(staffId));
    updateMutation.mutateAsync({ staffId, field, value })
      .finally(() => {
        setUpdatingIds((prev) => { const n = new Set(prev); n.delete(staffId); return n; });
      });
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      toast.success("共有URLをコピーしました");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isLoading = eventLoading || staffLoading;
  const isSample = !event && !isLoading;
  const displayEvent = event ?? SAMPLE_EVENT;
  const displayStaff = isSample ? SAMPLE_STAFF : staffList;

  const stats = useMemo(() => {
    const total = displayStaff.length;
    const passChecked = displayStaff.filter((s) => s.pass_checked).length;
    const passReturned = displayStaff.filter((s) => s.pass_returned).length;
    const penChecked = displayStaff.filter((s) => s.penlight_checked).length;
    const penReturned = displayStaff.filter((s) => s.penlight_returned).length;
    const bentoDay = displayStaff.filter((s) => s.bento_day_checked).length;
    const bentoNight = displayStaff.filter((s) => s.bento_night_checked).length;
    return { total, passChecked, passReturned, penChecked, penReturned, bentoDay, bentoNight };
  }, [displayStaff]);

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="bg-card border-b border-border sticky top-0 z-40 safe-area-top">
        <div className="px-2 py-1.5 flex items-center gap-1">
          <Link to="/" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm truncate">{displayEvent?.name || "スタッフ管理"}</h1>
            <p className="text-[10px] text-muted-foreground truncate">
              {displayEvent?.date && formatJaDate(displayEvent.date)}
              {displayEvent?.venue && `　${displayEvent.venue}`}
            </p>
          </div>
          <button
            onClick={handleCopyUrl}
            className="flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-[11px] font-medium text-primary-foreground shrink-0 hover:bg-primary/90 transition-colors"
          >
            <Share2 className="w-3 h-3" />{copied ? "コピー済" : "URL共有"}
          </button>
        </div>
      </header>

      {/* サンプル表示バナー */}
      {isSample && (
        <div className="mx-2 mt-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-3 py-1.5">
          <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">サンプル表示中　バックエンド接続後に実データに切り替わります</p>
        </div>
      )}

      {/* 統計バッジ */}
      <div className="px-2 pt-2">
        <div className="grid grid-cols-3 gap-1">
          <StatBadge icon={Ticket} label="パス" checked={stats.passChecked} total={stats.total} returned={stats.passReturned} color="indigo" />
          <StatBadge icon={Lightbulb} label="ペンライト" checked={stats.penChecked} total={stats.total} returned={stats.penReturned} color="amber" />
          <StatBadge icon={Utensils} label="弁当" checked={stats.bentoDay + stats.bentoNight} total={stats.total * 2} color="green" />
        </div>
      </div>

      {/* 弁当詳細 */}
      <div className="px-2 pt-1">
        <div className="flex gap-1">
          <div className="flex-1 flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1">
            <Utensils className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[11px] font-medium">昼弁当</span>
            <span className="ml-auto text-[11px] font-bold text-green-600">{stats.bentoDay}/{stats.total}</span>
          </div>
          <div className="flex-1 flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1">
            <Moon className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-[11px] font-medium">夜弁当</span>
            <span className="ml-auto text-[11px] font-bold text-purple-600">{stats.bentoNight}/{stats.total}</span>
          </div>
        </div>
      </div>

      {/* スタッフリスト */}
      <div className="px-2 py-2 space-y-1.5 pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="h-6 w-6 rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
            <p className="text-xs text-muted-foreground">スタッフを読み込んでいます</p>
          </div>
        ) : displayStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Users className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">スタッフが登録されていません</p>
          </div>
        ) : (
          displayStaff.map((staff) => (
            <StaffManageCard
              key={staff.id}
              staff={staff}
              onUpdate={handleUpdate}
              updating={updatingIds.has(staff.id)}
            />
          ))
        )}
      </div>

      {/* フッター */}
      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-1.5 safe-area-bottom">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <Lock className="w-2.5 h-2.5" />
          <span>URLを知っている人のみアクセスできます</span>
        </div>
      </footer>
    </div>
  );
}

function StatBadge({ icon: Icon, label, checked, total, returned, color }) {
  const colorMap = {
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    green: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  };
  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${colorMap[color]}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium leading-none">{label}</p>
        <p className="text-[11px] font-bold leading-tight mt-0.5">{checked}/{total}</p>
      </div>
      {returned !== undefined && returned > 0 && (
        <span className="text-[9px] opacity-70">返{returned}</span>
      )}
    </div>
  );
}

function StaffManageCard({ staff, onUpdate, updating }) {
  return (
    <div className={`rounded-xl border border-border bg-card shadow-sm transition-opacity ${updating ? "opacity-60" : ""}`}>
      {/* 名前 */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border">
        <span className="text-sm font-bold truncate flex-1">{staff.name}</span>
        {staff.gender && (
          <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${staff.gender === "男" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"}`}>
            {staff.gender}
          </span>
        )}
      </div>

      {/* パス */}
      <ManageRow
        icon={Ticket}
        iconColor="text-indigo-500"
        label="パス"
        checked={staff.pass_checked}
        onToggleCheck={() => onUpdate(staff.id, "pass_checked", !staff.pass_checked)}
        number={staff.pass_number}
        onNumberChange={(v) => onUpdate(staff.id, "pass_number", v)}
        returned={staff.pass_returned}
        onToggleReturn={() => onUpdate(staff.id, "pass_returned", !staff.pass_returned)}
      />

      {/* ペンライト */}
      <ManageRow
        icon={Lightbulb}
        iconColor="text-amber-500"
        label="ペンライト"
        checked={staff.penlight_checked}
        onToggleCheck={() => onUpdate(staff.id, "penlight_checked", !staff.penlight_checked)}
        number={staff.penlight_number}
        onNumberChange={(v) => onUpdate(staff.id, "penlight_number", v)}
        returned={staff.penlight_returned}
        onToggleReturn={() => onUpdate(staff.id, "penlight_returned", !staff.penlight_returned)}
      />

      {/* 弁当 */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        <Utensils className={`w-3.5 h-3.5 shrink-0 ${staff.bento_day_checked || staff.bento_night_checked ? "text-green-500" : "text-muted-foreground/50"}`} />
        <span className="text-[11px] font-medium w-12 shrink-0">弁当</span>
        <div className="flex gap-1 flex-1">
          <BentoToggle label="昼" checked={staff.bento_day_checked} onClick={() => onUpdate(staff.id, "bento_day_checked", !staff.bento_day_checked)} />
          <BentoToggle label="夜" checked={staff.bento_night_checked} onClick={() => onUpdate(staff.id, "bento_night_checked", !staff.bento_night_checked)} night />
        </div>
      </div>
    </div>
  );
}

function ManageRow({ icon: Icon, iconColor, label, checked, onToggleCheck, number, onNumberChange, returned, onToggleReturn }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border/50">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${checked ? iconColor : "text-muted-foreground/50"}`} />
      <span className="text-[11px] font-medium w-12 shrink-0">{label}</span>
      <button
        type="button"
        onClick={onToggleCheck}
        className={`flex h-6 items-center gap-0.5 rounded-md border px-1.5 text-[10px] font-medium transition-colors shrink-0 ${
          checked
            ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400"
            : "bg-transparent border-border text-muted-foreground"
        }`}
        aria-pressed={checked}
      >
        <Check className="w-3 h-3" />貸出
      </button>
      <input
        type="text"
        value={number || ""}
        onChange={(e) => onNumberChange(e.target.value)}
        placeholder="番号"
        className="h-6 min-w-0 flex-1 rounded-md border border-border bg-background px-1.5 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        type="button"
        onClick={onToggleReturn}
        className={`flex h-6 items-center gap-0.5 rounded-md border px-1.5 text-[10px] font-medium transition-colors shrink-0 ${
          returned
            ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
            : "bg-transparent border-border text-muted-foreground"
        }`}
        aria-pressed={returned}
      >
        <RotateCcw className="w-3 h-3" />返却
      </button>
    </div>
  );
}

function BentoToggle({ label, checked, onClick, night }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-6 flex-1 items-center justify-center gap-0.5 rounded-md border text-[10px] font-bold transition-colors ${
        checked
          ? night
            ? "bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400"
            : "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400"
          : "bg-transparent border-border text-muted-foreground"
      }`}
      aria-pressed={checked}
    >
      <Check className={`w-3 h-3 ${checked ? "" : "opacity-40"}`} />{label}
    </button>
  );
}