import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const CACHE_KEY = "crewly_geo_access";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6時間キャッシュ

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.allowed !== "boolean" || !data.ts) return null;
    if (Date.now() - data.ts > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(allowed, country) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ allowed, country, ts: Date.now() }));
  } catch {
    /* localStorage 利用不可環境は無視 */
  }
}

/**
 * アプリ全体をガードし、日本国外からのアクセスを制限する。
 * - 初期マウント時にバックエンド(checkGeoAccess)でIPベースの国判定を行う
 * - 判定結果はlocalStorageに6時間キャッシュし、ページ遷移のたびに再判定しない
 * - 許可時は children をそのまま描画、不許可時は最小限の403画面を表示
 * - 判定中は何も描画しない（ちらつき防止）
 */
export default function GeoGuard({ children }) {
  const [state, setState] = useState("checking"); // checking | allowed | blocked

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setState(cached.allowed ? "allowed" : "blocked");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("checkGeoAccess", {});
        const data = res?.data || {};
        const allowed = data.allowed !== false; // 判定不能時は true（fail-open）を尊重
        const country = data.country || "";
        if (cancelled) return;
        writeCache(allowed, country);
        setState(allowed ? "allowed" : "blocked");
      } catch {
        if (cancelled) return;
        // バックエンド呼び出し失敗時は fail-open（許可）
        writeCache(true, "");
        setState("allowed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") return null;
  if (state === "blocked") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center select-none">
        <h1 className="text-5xl font-bold text-foreground tracking-tight">403</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Access from outside Japan is restricted.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          このサービスは日本国内からのアクセスのみ利用できます。
        </p>
      </div>
    );
  }
  return children;
}