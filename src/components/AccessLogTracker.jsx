import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { trackPageView, trackInteraction, flushStayTime } from "@/lib/accessTracker";

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

  // ボタン・リンクなどの操作をInteractionLogとして記録
  useEffect(() => {
    const INTERACTIVE_SELECTOR = 'button, a, [role="button"], [role="tab"], select, summary';
    const handleClick = (e) => {
      const el = e.target?.closest?.(INTERACTIVE_SELECTOR);
      if (!el) return;
      const label = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100);
      if (!label) return;
      trackInteraction({
        pagePath: location.pathname,
        actionType: "click",
        elementType: el.tagName.toLowerCase() + (el.getAttribute("role") ? `(${el.getAttribute("role")})` : ""),
        elementLabel: label,
        user,
      });
    };
    const handleChange = (e) => {
      const el = e.target;
      if (!el || el.tagName !== "SELECT") return;
      const label = (el.getAttribute("aria-label") || el.id || el.name || "セレクト").slice(0, 100);
      const value = String(el.selectedOptions?.[0]?.text || el.value || "").slice(0, 100);
      trackInteraction({
        pagePath: location.pathname,
        actionType: "change",
        elementType: "select",
        elementLabel: label,
        elementValue: value,
        user,
      });
    };
    document.addEventListener("click", handleClick, true);
    document.addEventListener("change", handleChange, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("change", handleChange, true);
    };
  }, [user, location.pathname]);

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