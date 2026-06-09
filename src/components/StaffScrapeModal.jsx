import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Download, Loader2, CheckCircle2, AlertCircle, ChevronLeft, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { unwrapFunctionResponse } from "@/lib/base44Response";

export default function StaffScrapeModal({ eventId, onClose }) {
  const [activeTab, setActiveTab] = useState("history"); // "history" | "manual"
  const [urlHistory, setUrlHistory] = useState([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [staffList, setStaffList] = useState(null);
  const [checked, setChecked] = useState({});
  const [existingNames, setExistingNames] = useState(new Set());
  // which tab triggered Phase2 (to return to correct tab)
  const [sourceTab, setSourceTab] = useState("history");

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.entities.Event.filter({ id: eventId }).then((events) => {
      const ev = events?.[0];
      const history = ev?.scrape_url_history || (ev?.scrape_url ? [ev.scrape_url] : []);
      setUrlHistory(history);
    }).catch(() => {});
  }, [eventId]);

  const handleFetch = async (fetchUrl) => {
    const targetUrl = (fetchUrl || url).trim();
    if (!targetUrl) return;
    setLoading(true);
    setError(null);
    setStaffList(null);
    setResult(null);

    try {
      const existingRes = await base44.functions.invoke("getStaffList", { eventId });
      const fetchedExistingNames = new Set((existingRes?.data?.staff ?? []).map((s) => s.name));
      setExistingNames(fetchedExistingNames);

      const nextHistory = [targetUrl, ...urlHistory.filter((u) => u !== targetUrl)].slice(0, 10);
      base44.entities.Event.update(eventId, { scrape_url: targetUrl, scrape_url_history: nextHistory }).catch(() => {});
      setUrlHistory(nextHistory);
      setUrl(targetUrl);

      const res = await base44.functions.invoke("scrapeStaffNames", { url: targetUrl, eventId });
      const data = unwrapFunctionResponse(res);
      if (data.error) {
        setError(data.error);
      } else if (!data.staffList || data.staffList.length === 0) {
        setError(data.message || '名前が見つかりませんでした');
      } else {
        setStaffList(data.staffList);
        const initChecked = {};
        data.staffList.forEach((s, i) => {
          initChecked[i] = s.defaultChecked && !fetchedExistingNames.has(s.name);
        });
        setChecked(initChecked);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "取得中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchFromHistory = (historyUrl) => {
    setSourceTab("history");
    handleFetch(historyUrl);
  };

  const handleFetchFromManual = () => {
    setSourceTab("manual");
    handleFetch(url);
  };

  const handleSave = async () => {
    const selectedStaff = staffList.filter((_, i) => checked[i]).map((s) => ({
      name: s.name,
      acast_id: s.acast_id || null
    }));
    if (selectedStaff.length === 0) { setError("スタッフが選択されていません"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("scrapeStaffNames", { url: url.trim(), eventId, selectedStaff });
      const data = unwrapFunctionResponse(res);
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        setStaffList(null);
        queryClient.invalidateQueries({ queryKey: ["staff", eventId] });
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "保存中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStaffList(null);
    setResult(null);
    setError(null);
    setActiveTab(sourceTab);
  };

  const toggleAll = (val) => {
    const next = {};
    staffList.forEach((_, i) => { next[i] = val; });
    setChecked(next);
  };

  const checkedCount = staffList ? staffList.filter((_, i) => checked[i]).length : 0;
  const isPhase2 = staffList && !result;
  const isPhase3 = !!result;
  const showTabs = !isPhase2 && !isPhase3;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
        initial={{ y: 34, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-base flex items-center gap-2">
            {isPhase2 && (
              <button onClick={handleBack} className="p-1 rounded hover:bg-muted mr-1">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <Download className="w-4 h-4 text-primary" />
            {isPhase2 ? "取得スタッフの確認" : "A-CASTからスタッフを取得"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        {showTabs && (
          <div className="flex border-b border-border shrink-0">
            {[{ id: "history", label: "履歴から選ぶ" }, { id: "manual", label: "URLを直接入力" }].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setError(null); }}
                className={`flex-1 text-sm py-2.5 font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Phase 1: 履歴タブ */}
          {showTabs && activeTab === "history" && (
            <div>
              {urlHistory.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">まだ履歴がありません。URLを直接入力してください。</p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("manual")}>
                    URLを直接入力する
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {urlHistory.map((u, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        u === url && url ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <span className={`flex-1 text-xs truncate min-w-0 ${u === url && url ? "text-primary font-medium" : "text-muted-foreground"}`}>
                        {u}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-7 text-xs px-2 gap-1"
                        disabled={loading}
                        onClick={() => handleFetchFromHistory(u)}
                      >
                        {loading && url === u ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        再取得
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Phase 1: 直接入力タブ */}
          {showTabs && activeTab === "manual" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">取得元URL</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/staff-page"
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) handleFetchFromManual();
                  }}
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  A-CAST 点呼表からスタッフリストを取得します。電話番号などの情報は収集しません。
                </p>
              </div>
            </div>
          )}

          {/* Phase 2: スタッフ選択テーブル */}
          {isPhase2 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{staffList.length}名を検出　選択中: <span className="font-semibold text-foreground">{checkedCount}名</span></p>
                <div className="flex gap-2">
                  <button onClick={() => toggleAll(true)} className="text-xs text-primary hover:underline">全選択</button>
                  <span className="text-muted-foreground text-xs">/</span>
                  <button onClick={() => toggleAll(false)} className="text-xs text-muted-foreground hover:underline">全解除</button>
                </div>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="w-8 px-2 py-2 text-center font-medium text-muted-foreground">✓</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">氏名</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">種別</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">メモ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((staff, i) => {
                      const isRegistered = staff.name && existingNames.has?.(staff.name);
                      return (
                        <tr
                          key={i}
                          onClick={() => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                          className={`border-t border-border/50 cursor-pointer transition-colors ${checked[i] ? "bg-card hover:bg-muted/30" : "bg-muted/20 hover:bg-muted/40 opacity-60"}`}
                        >
                          <td className="px-2 py-2 text-center">
                            <input type="checkbox" checked={!!checked[i]}
                              onChange={() => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                              onClick={(e) => e.stopPropagation()}
                              className="w-3.5 h-3.5 accent-primary" />
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {staff.name}
                            {isRegistered && <span className="ml-1.5 text-[10px] text-muted-foreground border border-border px-1 py-0.5 rounded">登録済</span>}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {staff.type && (
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] border ${staff.type.includes('物販') ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-muted border-border text-muted-foreground'}`}>
                                {staff.type}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {staff.memo && (
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] border ${staff.memo === '帰宅' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-muted border-border text-muted-foreground'}`}>
                                {staff.memo}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Phase 3: 完了 */}
          {isPhase3 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4" />取得完了
              </div>
              <p>{result.found}名を選択 → {result.added}名を追加（{result.skipped}名は重複スキップ）</p>
              {result.names?.length > 0 && (
                <div className="mt-2 text-xs text-green-700 max-h-32 overflow-y-auto space-y-0.5">
                  {result.names.map((name, i) => <div key={i}>・{name}</div>)}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5 pt-2 shrink-0 border-t border-border">
          <Button variant="outline" onClick={isPhase2 ? handleBack : onClose} className="flex-1">
            {isPhase2 ? "戻る" : "閉じる"}
          </Button>
          {showTabs && activeTab === "manual" && !isPhase3 && (
            <Button onClick={handleFetchFromManual} disabled={!url.trim() || loading} className="flex-1 gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {loading ? "取得中..." : "スタッフを確認"}
            </Button>
          )}
          {isPhase2 && (
            <Button onClick={handleSave} disabled={checkedCount === 0 || loading} className="flex-1 gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {loading ? "保存中..." : `${checkedCount}名を追加`}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}