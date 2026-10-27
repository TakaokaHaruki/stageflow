import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// 非公開ストレージの署名付きURLをURI単位でキャッシュする（1時間有効・50分で再取得）
const cache = new Map();
const TTL_MS = 50 * 60 * 1000;

function readCache(uris) {
  return uris.reduce((acc, uri) => {
    const hit = cache.get(uri);
    if (hit?.url) acc[uri] = hit.url;
    return acc;
  }, {});
}

export default function useSignedUrls(uris = []) {
  const key = uris.filter(Boolean).join("|");
  const [urls, setUrls] = useState(() => readCache(uris));

  useEffect(() => {
    if (!key) {
      setUrls({});
      return;
    }
    const list = key.split("|");
    setUrls(readCache(list));

    const missing = list.filter((uri) => {
      const hit = cache.get(uri);
      return !hit || Date.now() > hit.expiresAt;
    });
    if (!missing.length) return;

    let cancelled = false;
    Promise.all(
      missing.map(async (uri) => {
        try {
          const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 });
          cache.set(uri, { url: res.signed_url || "", expiresAt: Date.now() + TTL_MS });
        } catch {
          cache.set(uri, { url: "", expiresAt: Date.now() + 60 * 1000 });
        }
      })
    ).then(() => {
      if (!cancelled) setUrls(readCache(list));
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return urls;
}