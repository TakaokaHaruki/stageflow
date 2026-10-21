// ポータルのチーフPIN認証とセッショントークンを扱う共有モジュール。
// サーバー側（バックエンド関数）からのみ利用され、クライアントには公開されない。

const AUTH_KEY = 'eef9245bfeadcabbd62c095963e02f80fc8fa0549d7222cad57bf39c47edbbde';
const PBKDF2_ITERATIONS = 120000;

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomSaltHex() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

export function jstNowStr() {
  return new Date(Date.now() + 9 * 60 * 60000).toISOString().replace('T', ' ').slice(0, 16);
}

export function jstPlusMinutes(minutes) {
  return new Date(Date.now() + 9 * 60 * 60000 + minutes * 60000).toISOString().replace('T', ' ').slice(0, 16);
}

export async function pbkdf2Hash(pin, saltHex, iterations = PBKDF2_ITERATIONS) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array((saltHex.match(/../g) || []).map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return bytesToHex(new Uint8Array(digest));
}

function timingSafeEqual(a, b) {
  const A = new TextEncoder().encode(String(a));
  const B = new TextEncoder().encode(String(b));
  if (A.length !== B.length) return false;
  let diff = 0;
  for (let i = 0; i < A.length; i++) diff |= A[i] ^ B[i];
  return diff === 0;
}

// 保存形式: 'pbkdf2$<iterations>$<saltHex>$<hashHex>' または旧形式（ソルトなしSHA-256の64hex）。
// 旧形式での照合成功時はPBKDF2へ自動移行する（upgradedHashを返す）。
export async function verifyPin(pin, stored) {
  if (!pin || !stored) return { ok: false };
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    const iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
    const saltHex = parts[2] || '';
    const hashHex = parts[3] || '';
    const hash = await pbkdf2Hash(pin, saltHex, iterations);
    return { ok: timingSafeEqual(hash, hashHex) };
  }
  const legacy = await sha256Hex(pin);
  if (timingSafeEqual(legacy, stored)) {
    const saltHex = randomSaltHex();
    const upgraded = 'pbkdf2$' + PBKDF2_ITERATIONS + '$' + saltHex + '$' + (await pbkdf2Hash(pin, saltHex));
    return { ok: true, upgradedHash: upgraded };
  }
  return { ok: false };
}

// PIN認証成功時に発行し、以降のポータル操作関数呼び出しで検証するトークン（当日限定）
export async function makeSessionToken(acastId) {
  return hmacHex(AUTH_KEY, String(acastId) + '|' + jstDateStr());
}

export async function verifySessionToken(acastId, token) {
  if (!acastId || !token) return false;
  const expected = await makeSessionToken(acastId);
  return timingSafeEqual(expected, token);
}

async function hmacHex(keyStr, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(keyStr), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return bytesToHex(new Uint8Array(sig));
}

function jstDateStr() {
  return new Date(Date.now() + 9 * 60 * 60000).toISOString().slice(0, 10);
}