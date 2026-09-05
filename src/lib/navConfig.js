import { Home, CalendarDays, Settings, ShieldCheck, UserCircle, Info, MessageCircle } from "lucide-react";

/**
 * 新タブ構成の共通ナビ定義。
 * ホーム / イベント一覧 / 管理設定(admin,chief) / 管理者設定(admin) / アカウント / インフォメーション
 */
export function getNavItems({ isAdmin = false, canEdit = false, isGuest = false } = {}) {
  if (isGuest) {
    return [
      { id: "events", label: "イベント一覧", short: "イベント", icon: CalendarDays, path: "/events", description: "公開中のイベントを確認できます" },
    ];
  }
  return [
    { id: "home", label: "ホーム", short: "ホーム", icon: Home, path: "/home", description: "運営状況のサマリーと各機能への導線" },
    { id: "events", label: "イベント一覧", short: "イベント", icon: CalendarDays, path: "/events", description: "イベントの作成・管理と詳細設定" },
    { id: "support", label: "運営サポート", short: "サポート", icon: MessageCircle, path: "/support", description: "配置や運営の相談ができるAIチャット" },
    ...(canEdit
      ? [
          { id: "management", label: "管理設定", short: "管理設定", icon: Settings, path: "/management", description: "ポジション・プリセット・会場・バックアップなどのアプリ共通設定" },
        ]
      : []),
    ...(isAdmin
      ? [{ id: "admin-settings", label: "管理者設定", short: "管理者", icon: ShieldCheck, path: "/admin-settings", description: "ユーザー管理とポータル制限" }]
      : []),
    { id: "account", label: "アカウント", short: "アカウント", icon: UserCircle, path: "/account", description: "表示名・テーマ・ポータルQRの確認" },
    { id: "information", label: "インフォメーション", short: "インフォ", icon: Info, path: "/information", description: "Crewlyの使い方と操作ガイド" },
  ];
}