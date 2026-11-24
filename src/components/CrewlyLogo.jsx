import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const LOGO_URL = "https://base44.app/api/apps/6a04d375dd2d16805b295b5a/files/mp/public/6a04d375dd2d16805b295b5a/c634342900ae9222569adfde1768de32_crewly-logo.png";

/**
 * Crewly ロゴ（公式ロゴ画像）。
 * - 既定: シンボル + Crewly ワードマークの横長ロックアップ
 * - administrator: ロゴ右に小さな ADMINISTRATOR ラベルを添える
 */
export default function CrewlyLogo({ className = "", disableLink = false, administrator = false, iconOnly = false, size = 26 }) {
  const { isAuthenticated } = useAuth();
  const Wrapper = disableLink ? "div" : Link;
  const wrapperProps = disableLink
    ? { className: `flex items-center gap-2 select-none shrink-0 group ${className}` }
    : { to: isAuthenticated ? "/home" : "/", className: `flex items-center gap-2 select-none shrink-0 group ${className}`, "aria-label": "Crewly トップへ" };

  // 公式ロゴ（横長 1600:500）。高さ基準で表示
  const img = (
    <img
      src={LOGO_URL}
      alt="Crewly"
      height={size}
      className="shrink-0 group-hover:opacity-85 transition-opacity"
      style={{ height: size, width: "auto" }}
    />
  );

  return (
    <Wrapper {...wrapperProps}>
      <span className="flex items-center gap-2 group-hover:opacity-90 transition-opacity">
        {img}
        {administrator && (
          <span className="ml-0.5 text-[6px] font-extrabold leading-none tracking-[0.28px] text-primary">ADMINISTRATOR</span>
        )}
      </span>
    </Wrapper>
  );
}