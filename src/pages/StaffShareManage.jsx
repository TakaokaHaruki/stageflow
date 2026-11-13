import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Ticket, Lightbulb, Utensils, Moon, Check, Users, Share2, Lock, Search } from "lucide-react";
import { toast } from "sonner";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { formatJaDate } from "@/lib/dateFormat";

const SAMPLE_EVENT = { name: "サンプルコンサート", date: "2026-11-15", venue: "東京ドーム" };
const SAMPLE_STAFF = [
  { id: "s1", name: "佐藤　花子", gender: "女", pass_checked: true, pass_number: "P-001", pass_returned: false, penlight_checked: true, penlight_number: "L-12", penlight_returned: false, bento_day_checked: true, bento_night_checked: false },
  { id: "s2", name: "鈴木　太郎", gender: "男", pass_checked: false, pass_number: "", pass_returned: false, penlight_checked: false, penlight_number: "", penlight_returned: false, bento_day_checked: false, bento_night_checked: false },
  { id: "s3", name: "高橋　美咲", gender: "女", pass_checked: true, pass_number: "P-003", pass_returned: true, penlight_checked: true, penlight_number: "L-05", penlight_returned: true, bento_day_checked: true, bento_night_checked: true },
];

export default function StaffShareManage() {
  const { eventId } = useParams();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
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
    const shareUrl = `https://clewly.jp/events/${eventId}/share`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success("共有URLをコピーしました");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isLoading = eventLoading || staffLoading;
  const isSample = !event && !isLoading;
  const displayEvent = event ?? SAMPLE_EVENT;
  const allStaff = isSample ? SAMPLE_STAFF : staffList;
  const displayStaff = useMemo(
    () => allStaff.filter((s) => !search || s.name.includes(search)),
    [allStaff, search]
  );

  const stats = useMemo(() => {
    const total = allStaff.length;
    return {
      total,
      passChecked: allStaff.filter((s) => s.pass_checked).length,
      passReturned: allStaff.filter((s) => s.pass_returned).length,
      penChecked: allStaff.filter((s) => s.penlight_checked).length,
      penReturned: allStaff.filter((s) => s.penlight_returned).length,
      bentoDay: allStaff.filter((s) => s.bento_day_checked).length,
      bentoNight: allStaff.filter((s) => s.bento_night_checked).length,
    };
  }, [allStaff]);

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="bg-card border-b border-border sticky top-0 z-40 safe-area-top">
        <div className="px-2 py-1.5 flex items-center gap-1.5">
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
            <Share2 className="w-3 h-3" />{copied ? "コピー済" : "共有"}
          </button>
        </div>
      </header>

      {/* 統計バッジ（コンパクト1行） */}
      <div className="px-2 pt-1.5">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          <MiniStat icon={Ticket} label="パス" checked={stats.passChecked} total={stats.total} returned={stats.passReturned} colorClass="text-indigo-600 dark:text-indigo-400" />
          <MiniStat icon={Lightbulb} label="ペン" checked={stats.penChecked} total={stats.total} returned={stats.penReturned} colorClass="text-amber-600 dark:text-amber-400" />
          <MiniStat icon={Utensils} label="昼弁" checked={stats.bentoDay} total={stats.total} colorClass="text-green-600 dark:text-green-400" />
          <MiniStat icon={Moon} label="夜弁" checked={stats.bentoNight} total={stats.total} colorClass="text-purple-600 dark:text-purple-400" />
        </div>
      </div>

      {/* 検索 */}
      <div className="px-2 pt-1.5">
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 h-8">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="スタッフ名で検索"
            className="flex-1 bg-transparent text-xs focus:outline-none min-w-0"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[10px] text-muted-foreground hover:text-foreground">✕</button>
          )}
        </div>
      </div>

      {isSample && (
        <div className="mx-2 mt-1.5 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-3 py-1">
          <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">サンプル表示中</p>
        </div>
      )}

      {/* スタッフリスト（テーブル形式） */}
      <div className="px-2 py-2 pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="h-6 w-6 rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
            <p className="text-xs text-muted-foreground">読み込み中</p>
          </div>
        ) : displayStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Users className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">{search ? "該当するスタッフがいません" : "スタッフが登録されていません"}</p>
          </div>
        ) : (
          <>
            {/* ヘッダー行 */}
            <div className="flex items-center gap-0.5 px-1 pb-1 text-[9px] font-bold text-muted-foreground">
              <div className="flex-1 min-w-0">名前</div>
              <div className="w-[76px] shrink-0 text-center flex items-center justify-center gap-0.5"><Ticket className="w-2.5 h-2.5" />パス</div>
              <div className="w-[76px] shrink-0 text-center flex items-center justify-center gap-0.5"><Lightbulb className="w-2.5 h-2.5" />ペン</div>
              <div className="w-7 shrink-0 text-center flex items-center justify-center"><Utensils className="w-2.5 h-2.5" /></div>
              <div className="w-7 shrink-0 text-center flex items-center justify-center"><Moon className="w-2.5 h-2.5" /></div>
            </div>

            {/* スタッフ行 */}
            <div className="space-y-1">
              {displayStaff.map((staff) => (
                <StaffRow
                  key={staff.id}
                  staff={staff}
                  onUpdate={handleUpdate}
                  updating={updatingIds.has(staff.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* フッター */}
      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-1.5 safe-area-bottom">
        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <Lock className="w-2.5 h-2.5" />
          <span>URLを知っている人のみアクセスできます</span>
        </div>
      </footer>
    </div>
  );
}

function MiniStat({ icon: Icon, label, checked, total, returned, colorClass }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 shrink-0">
      <Icon className={`w-3 h-3 ${colorClass}`} />
      <span className="text-[10px] font-medium">{label}</span>
      <span className={`text-[11px] font-bold ${colorClass}`}>{checked}/{total}</span>
      {returned !== undefined && returned > 0 && (
        <span className="text-[9px] text-muted-foreground">返{returned}</span>
      )}
    </div>
  );
}

function StaffRow({ staff, onUpdate, updating }) {
  return (
    <div className={`flex items-center gap-0.5 rounded-xl border border-border bg-card shadow-sm transition-opacity ${updating ? "opacity-60" : ""}`}>
      {/* 名前（縦軸・1行・見切れなし） */}
      <div className="flex-1 min-w-0 flex items-center gap-1 px-2 py-2 border-r border-border/50">
        <p className="text-xs font-bold whitespace-nowrap">{staff.name}</p>
        {staff.gender && (
          <span className={`text-[8px] font-bold shrink-0 ${staff.gender === "男" ? "text-blue-500" : "text-pink-500"}`}>{staff.gender}</span>
        )}
      </div>

      {/* パス・ペンライト（番号+返却） */}
      <LoanCell
        number={staff.pass_number}
        returned={staff.pass_returned}
        onNumberChange={(v) => {
          onUpdate(staff.id, "pass_number", v);
          onUpdate(staff.id, "pass_checked", v !== "");
        }}
        onToggleReturn={() => onUpdate(staff.id, "pass_returned", !staff.pass_returned)}
        checkColor="indigo"
      />
      <LoanCell
        number={staff.penlight_number}
        returned={staff.penlight_returned}
        onNumberChange={(v) => {
          onUpdate(staff.id, "penlight_number", v);
          onUpdate(staff.id, "penlight_checked", v !== "");
        }}
        onToggleReturn={() => onUpdate(staff.id, "penlight_returned", !staff.penlight_returned)}
        checkColor="amber"
      />

      {/* 昼・夜弁当 */}
      <BentoCell checked={staff.bento_day_checked} onClick={() => onUpdate(staff.id, "bento_day_checked", !staff.bento_day_checked)} color="green" />
      <BentoCell checked={staff.bento_night_checked} onClick={() => onUpdate(staff.id, "bento_night_checked", !staff.bento_night_checked)} color="purple" />
    </div>
  );
}

function LoanCell({ number, returned, onNumberChange, onToggleReturn, checkColor }) {
  const colorMap = {
    indigo: "border-indigo-300 dark:border-indigo-700",
    amber: "border-amber-300 dark:border-amber-700",
  };
  return (
    <div className="w-[76px] shrink-0 flex items-center gap-0.5 px-0.5 border-r border-border/50">
      {/* 番号（貸出＝番号入力のみ） */}
      <input
        type="text"
        inputMode="text"
        value={number || ""}
        onChange={(e) => onNumberChange(e.target.value)}
        placeholder="No."
        className={`h-7 flex-1 min-w-0 rounded-md border px-1 text-[10px] font-medium text-center focus:outline-none focus:ring-1 focus:ring-ring ${
          number ? `bg-background ${colorMap[checkColor]}` : "bg-muted/30 border-border/50 text-muted-foreground"
        }`}
      />
      {/* 返却チェック */}
      <button
        type="button"
        onClick={onToggleReturn}
        className={`flex h-7 w-6 items-center justify-center rounded-md border transition-colors shrink-0 ${
          returned
            ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400"
            : "bg-transparent border-border text-muted-foreground/60"
        }`}
        aria-pressed={returned}
        title="返却済み"
      >
        <Check className="w-3 h-3" />
      </button>
    </div>
  );
}

function BentoCell({ checked, onClick, color }) {
  const colorMap = {
    green: "bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600 text-green-600 dark:text-green-400",
    purple: "bg-purple-100 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600 text-purple-600 dark:text-purple-400",
  };
  return (
    <div className="w-7 shrink-0 flex items-center px-0.5">
      <button
        type="button"
        onClick={onClick}
        className={`flex h-7 w-full items-center justify-center rounded-md border transition-colors ${
          checked ? colorMap[color] : "bg-transparent border-border text-muted-foreground/60"
        }`}
        aria-pressed={checked}
      >
        <Check className={`w-3 h-3 ${checked ? "" : "opacity-40"}`} />
      </button>
    </div>
  );
}