import { base44 } from "@/api/base44Client";

// 貸与端末のトークン管理（localStorage）と端末情報の取得

const TOKEN_KEY = "crewly_device_token";

export function getDeviceToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setDeviceToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage 利用不可の場合は無視
  }
}

export function clearDeviceToken() {
  setDeviceToken("");
}

// 端末識別用のブラウザ・OS情報を取得
export function getDeviceInfo() {
  const ua = navigator.userAgent;
  let browser = "不明";
  let os = "不明";

  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";

  if (/Edg/.test(ua)) browser = "Edge";
  else if (/Chrome/.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox/.test(ua)) browser = "Firefox";
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = "Safari";

  return { browser, os, ua };
}

// 端末認証付きでバックエンド関数を呼び出す
export async function invokeWithDevice(functionName, payload = {}) {
  return base44.functions.invoke(functionName, {
    ...payload,
    device_token: getDeviceToken(),
  });
}