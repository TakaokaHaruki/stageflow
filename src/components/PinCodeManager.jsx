import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { KeyRound, Search, Loader2, Unlock, RotateCcw } from "lucide-react";
import { toJstString } from "@/lib/presenceTime";

// チーフPINの管理（設定・ロック解除・申請確認）。
// PIN初回設定は本人確認できないため、この画面（ログイン済み管理者）からのみ行う。
export default function PinCodeManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [setupAcastId, setSetupAcastId] = useState("");
  const [setupPin, setSetupPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: pinList, isLoading: pinsLoading } = useQuery({
    queryKey: ["pinCodes"],
    queryFn: () => base44.entities.PinCode.list("-created_date", 500),
    refetchInterval: 15000,
  });

  const acastIds = (pinList || []).map((p) => p.acast_id).filter(Boolean);
  const { data: staffList } = useQuery({
    queryKey: ["staffByAcastIds", acastIds.join(",")],
    queryFn: async () => {
      if (acastIds.length === 0) return [];
      const res = await base44.entities.Staff.filter({ acast_id: { $in: acastIds } });
      const byId = {};
      for (const s of res) {
        if (!byId[s.acast_id]) byId[s.acast_id] = s.name;
      }
      return byId;
    },
    enabled: acastIds.length > 0,
  });

  const nameOf = (acastId) => (staffList || {})[acastId] || "";

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (pinList || []).filter((p) => {
      if (!q) return true;
      const name = nameOf(p.acast_id);
      return (p.acast_id || "").toLowerCase().includes(q) || (name || "").toLowerCase().includes(q);
    });
  }, [pinList, search, staffList]);

  const handleSetup = async () => {
    const pin = setupPin.trim();
    if (!/^\d{4}$/.test(pin)) {
      toast.error("PINは4桁の数字で入力してください");
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("portalPinAuth", {
        action: "setup",
        acast_id: setupAcastId.trim(),
        pin,
      });
      const data = res?.data || {};
      if (data.ok) {
        toast.success("PINを設定しました");
        setSetupAcastId("");
        setSetupPin("");
        queryClient.invalidateQueries({ queryKey: ["pinCodes"] });
      } else {
        toast.error(data.error || "PINの設定に失敗しました");
      }
    } catch (e) {
      toast.error("PINの設定に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlock = async (rec) => {
    try {
      await base44.entities.PinCode.update(rec.id, {
        locked_until_jst: "",
        failed_attempts: 0,
      });
      toast.success("ロックを解除しました");
      queryClient.invalidateQueries({ queryKey: ["pinCodes"] });
    } catch (e) {
      toast.error("ロック解除に失敗しました");
    }
  };

  const handleClearRequest = async (rec) => {
    try {
      await base44.entities.PinCode.update(rec.id, {
        reset_requested: false,
        reset_requested_at_jst: "",
      });
      toast.success("申請を確認済みにしました");
      queryClient.invalidateQueries({ queryKey: ["pinCodes"] });
    } catch (e) {
      toast.error("処理に失敗しました");
    }
  };

  if (pinsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* PIN設定フォーム */}
      <div className="bg-card border border-border rounded-2xl shadow-md p-4">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5">
          <span className="bg-primary/10 text-primary rounded-lg p-1.5">
            <KeyRound className="w-4 h-4" />
          </span>
          PIN設定
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          チーフ（またはセクションチーフ）スタッフのA-CAST IDを指定して4桁のPINを設定します。
          設定済みのPINの値は確認できません。忘れた場合はここで再設定してください。
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="A-CAST ID"
            value={setupAcastId}
            onChange={(e) => setSetupAcastId(e.target.value)}
            className="sm:flex-1"
          />
          <Input
            placeholder="4桁のPIN"
            value={setupPin}
            onChange={(e) => setSetupPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            type="password"
            maxLength={4}
            className="sm:w-32"
          />
          <Button
            onClick={handleSetup}
            disabled={submitting || !setupAcastId.trim() || setupPin.length !== 4}
            className="gap-1.5"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            設定する
          </Button>
        </div>
      </div>

      {/* 一覧 */}
      <div className="bg-card border border-border rounded-2xl shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">PIN設定状況（{rows.length}件）</h3>
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ID・名前で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            レコードがありません。スタッフがポータルから「設定を申請」するとここに表示されます。
          </p>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((p) => {
              const now = toJstString(new Date());
              const locked = !!(p.locked_until_jst && p.locked_until_jst > now);
              const hasPin = !!p.pin_hash;
              return (
                <div key={p.id} className="py-2.5 flex items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {nameOf(p.acast_id) || "（名前不明）"}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{p.acast_id}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${hasPin ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                        {hasPin ? "PIN設定済み" : "PIN未設定"}
                      </span>
                      {p.reset_requested && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          設定・リセット申請あり
                        </span>
                      )}
                      {locked && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          ロック中（{p.locked_until_jst}まで）
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => {
                        setSetupAcastId(p.acast_id);
                        setSetupPin("");
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />再設定
                    </Button>
                    {locked && (
                      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => handleUnlock(p)}>
                        <Unlock className="w-3.5 h-3.5" />ロック解除
                      </Button>
                    )}
                    {p.reset_requested && (
                      <Button variant="outline" size="sm" className="h-8" onClick={() => handleClearRequest(p)}>
                        申請を確認済みにする
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}