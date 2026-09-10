import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { trackPageView } from "@/lib/accessTracker";

/**
 * アプリ全体のページアクセスをAccessLogへ記録する共通トラッカー。
 * Router配下に配置するだけで、全ページ遷移を非同期で記録する。
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

  return null;
}