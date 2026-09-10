import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { trackPageView, flushStayTime } from "@/lib/accessTracker";

/**
 * アプリ全体のページアクセスをAccessLogへ記録する共通トラッカー。
 * Router配下に配置するだけで、全ページ遷移を非同期で記録する。
 * ページ離脱・非表示時には滞在時間を確定させる。
 */
export default function AccessLogTracker() {
  const location = useLocation();
  const { user, authChecked } = useAuth();
  const prevPathRef = useRef(null);
  const loggedKeyRef = useRef("");

  useEffect(() => {
    if (!authChecked) return;
    const key = location.pathname + location.search;
    if (loggedKeyRef.current === key) return;
    loggedKeyRef.current = key;
    trackPageView({
      path: location.pathname,
      search: location.search,
      fromPath: prevPathRef.current,
      user,
    });
    prevPathRef.current = location.pathname;
  }, [location.pathname, location.search, authChecked, user]);

  // ページ離脱・タブ非表示時に現在ページの滞在時間を確定
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flushStayTime();
    };
    window.addEventListener("pagehide", flushStayTime);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", flushStayTime);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}