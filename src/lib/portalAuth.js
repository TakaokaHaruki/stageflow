const TOKEN_KEY = "crewly_portal_token";

// ポータルのPIN認証後にサーバーから発行されるセッショントークン（当日限定）を保持する
export function setPortalToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage不可の環境では無視
  }
}

export function getPortalToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function clearPortalToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // 無視
  }
}