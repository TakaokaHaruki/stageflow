import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const LOGO_URL = "https://base44.app/api/apps/6a04d375dd2d16805b295b5a/files/mp/public/6a04d375dd2d16805b295b5a/d7e2f908adce0f4fa31f27d7e6ecb43b_crewly-logo.png";

/**
 * Crewly ロゴ（公式ロゴ画像）。
 * シンボル + Crewly ワードマークの横長ロックアップ。
 * 高さ基準で表示し、リンクはログイン状態に応じて遷移先を切り替える。
 */
export default function CrewlyLogo({ className = "", disableLink = false, administrator = false, iconOnly = false, size = 26 }) {
  const { isAuthenticated } = useAuth();
  const Wrapper = disableLink ? "div" : Link;
  const wrapperProps = disableLink
    ? { className: `flex items-center select-none shrink-0 group ${className}` }
    : { to: isAuthenticated ? "/home" : "/", className: `flex items-center select-none shrink-0 group ${className}`, "aria-label": "Crewly トップへ" };

  return (
    <Wrapper {...wrapperProps}>
      <img
        src={LOGO_URL}
        alt="Crewly"
        height={size}
        className="shrink-0 group-hover:opacity-85 transition-opacity dark:brightness-0 dark:invert"
        style={{ height: size, width: "auto" }}
      />
    </Wrapper>
  );
}