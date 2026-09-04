// Crewly アプリ情報の定義（バージョン表記・オープンソースライセンス）
// バージョンを更新する場合は APP_VERSION を変更してください
export const APP_NAME = "Crewly";
export const APP_VERSION = "1.0.0";
export const APP_RELEASE_LABEL = "2026年9月";

// 使用しているオープンソースライブラリ（package.json の依存関係を元に整備）
// license は "MIT" / "Apache-2.0" / "ISC" / "BSD-3-Clause" / "その他" のいずれか
export const OPEN_SOURCE_LICENSES = [
  // --- MIT ---
  { name: "react", version: "^18.2.0", license: "MIT" },
  { name: "react-dom", version: "^18.2.0", license: "MIT" },
  { name: "react-router-dom", version: "^6.26.0", license: "MIT" },
  { name: "@tanstack/react-query", version: "^5.84.1", license: "MIT" },
  { name: "@radix-ui/react-*（Radix UI プリミティブ 27種）", version: "^1.1〜2.2", license: "MIT" },
  { name: "framer-motion", version: "^11.16.4", license: "MIT" },
  { name: "lodash", version: "^4.17.21", license: "MIT" },
  { name: "moment", version: "^2.30.1", license: "MIT" },
  { name: "date-fns", version: "^3.6.0", license: "MIT" },
  { name: "sonner", version: "^2.0.1", license: "MIT" },
  { name: "zod", version: "^3.24.2", license: "MIT" },
  { name: "react-hook-form", version: "^7.54.2", license: "MIT" },
  { name: "@hookform/resolvers", version: "^4.1.2", license: "MIT" },
  { name: "react-markdown", version: "^9.0.1", license: "MIT" },
  { name: "recharts", version: "^2.15.4", license: "MIT" },
  { name: "three", version: "^0.171.0", license: "MIT" },
  { name: "html2canvas", version: "^1.4.1", license: "MIT" },
  { name: "jspdf", version: "^4.2.1", license: "MIT" },
  { name: "qrcode", version: "^1.5.4", license: "MIT" },
  { name: "embla-carousel-react", version: "^8.5.2", license: "MIT" },
  { name: "cmdk", version: "^1.0.0", license: "MIT" },
  { name: "next-themes", version: "^0.4.4", license: "MIT" },
  { name: "vaul", version: "^1.1.2", license: "MIT" },
  { name: "input-otp", version: "^1.4.2", license: "MIT" },
  { name: "react-day-picker", version: "^8.10.1", license: "MIT" },
  { name: "react-leaflet", version: "^4.2.1", license: "MIT" },
  { name: "react-resizable-panels", version: "^2.1.7", license: "MIT" },
  { name: "react-hot-toast", version: "^2.6.0", license: "MIT" },
  { name: "clsx", version: "^2.1.1", license: "MIT" },
  { name: "tailwind-merge", version: "^3.0.2", license: "MIT" },
  { name: "class-variance-authority", version: "^0.7.1", license: "MIT" },
  { name: "tailwindcss-animate", version: "^1.0.7", license: "MIT" },
  { name: "@stripe/react-stripe-js", version: "^3.0.0", license: "MIT" },
  { name: "@stripe/stripe-js", version: "^5.2.0", license: "MIT" },
  { name: "tailwindcss", version: "^3.4.17", license: "MIT" },
  { name: "vite", version: "^6.1.0", license: "MIT" },
  { name: "@vitejs/plugin-react", version: "^4.3.4", license: "MIT" },
  { name: "postcss", version: "^8.5.3", license: "MIT" },
  { name: "autoprefixer", version: "^10.4.20", license: "MIT" },
  { name: "eslint", version: "^9.19.0", license: "MIT" },
  // --- Apache-2.0 ---
  { name: "@hello-pangea/dnd", version: "^17.0.0", license: "Apache-2.0" },
  { name: "jsqr", version: "^1.4.0", license: "Apache-2.0" },
  { name: "pdfjs-dist", version: "^4.10.38", license: "Apache-2.0" },
  { name: "typescript", version: "^5.8.2", license: "Apache-2.0" },
  // --- ISC ---
  { name: "lucide-react", version: "^0.475.0", license: "ISC" },
  { name: "canvas-confetti", version: "^1.9.4", license: "ISC" },
  // --- BSD-3-Clause ---
  { name: "react-quill", version: "^2.0.0", license: "BSD-3-Clause" },
  // --- その他 ---
  { name: "@base44/sdk", version: "^0.8.46", license: "その他", note: "Base44 提供SDK" },
  { name: "@base44/vite-plugin", version: "^1.0.34", license: "その他", note: "Base44 提供プラグイン" },
];