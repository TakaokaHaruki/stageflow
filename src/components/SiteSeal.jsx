import { useEffect, useRef } from "react";

/**
 * SSLサイトシールを表示するコンポーネント。
 * /siteseal/siteseal.js が #csi_siteseal_tag 内の要素を自動的に生成します。
 */
export default function SiteSeal({ className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.innerHTML = `
      <span id="csi_siteseal_tag" oncontextmenu="return false;">
        <a id="csi_siteseal_profile_link">
          <img alt="en_dark_typeA_100x50.png" id="csi_siteseal_image" width="100" height="50" style="display: none" />
        </a>
      </span>
    `;

    const s = document.createElement("script");
    s.src = "/siteseal/siteseal.js";
    s.async = true;
    document.body.appendChild(s);

    return () => {
      s.remove();
    };
  }, []);

  return <div ref={ref} className={className} />;
}