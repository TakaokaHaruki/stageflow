import { createContext, useContext } from "react";

// reportActivity: 編集操作時に呼び出し、在席レコードの操作時刻・対象を更新する
// presences: 同じイベントに在席中のユーザーリスト（自分を含む）
// currentUserId: 自分のユーザーID（バナーで自分を除外する用）
export const PresenceContext = createContext({
  reportActivity: () => {},
  presences: [],
  currentUserId: null,
});

export function usePresence() {
  return useContext(PresenceContext);
}

export function usePresenceActivity() {
  return useContext(PresenceContext).reportActivity;
}