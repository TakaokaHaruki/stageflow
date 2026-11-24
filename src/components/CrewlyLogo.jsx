import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

/**
 * Crewly ロゴ。
 * - 既定: シンボル + Crewly ワードマークの横長ロックアップ
 * - iconOnly: シンボルのみ
 * - administrator: ワードマーク下に小さな ADMINISTRATOR ラベルを添える
 */
export default function CrewlyLogo({ className = "", disableLink = false, administrator = false, iconOnly = false, size = 26 }) {
  const { isAuthenticated } = useAuth();
  const Wrapper = disableLink ? "div" : Link;
  const wrapperProps = disableLink
    ? { className: `flex items-center gap-2 select-none shrink-0 group ${className}` }
    : { to: isAuthenticated ? "/home" : "/", className: `flex items-center gap-2 select-none shrink-0 group ${className}`, "aria-label": "Crewly トップへ" };

  // シンボル部（C + 人 + 接続線）。元 SVG の左側グループを 0 0 500 500 に収める
  const Symbol = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 group-hover:opacity-85 transition-opacity"
      role="img"
      aria-label="Crewly"
    >
      <g fill="#1558C9">
        <path d="M 500 130 A 160 160 0 1 0 500 370 L 445 315 A 82 82 0 1 1 445 185 Z" />
        <circle cx="300" cy="210" r="31" />
        <circle cx="385" cy="195" r="31" />
        <path d="M 220 295 C 280 250 390 245 475 290 C 400 270 315 285 250 330 Z" />
      </g>
    </svg>
  );

  // 完全版ロックアップ（シンボル + Crewly ワードマーク）
  const Lockup = (
    <svg
      height={size}
      viewBox="0 0 1600 500"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 group-hover:opacity-85 transition-opacity"
      role="img"
      aria-label="Crewly"
    >
      <title>Crewly Logo</title>
      <g fill="#1558C9">
        <path d="M 500 130 A 160 160 0 1 0 500 370 L 445 315 A 82 82 0 1 1 445 185 Z" />
        <circle cx="300" cy="210" r="31" />
        <circle cx="385" cy="195" r="31" />
        <path d="M 220 295 C 280 250 390 245 475 290 C 400 270 315 285 250 330 Z" />
      </g>
      <g fill="#1558C9" transform="translate(760 340) scale(0.19 -0.19)">
        <path d="M774 -24 C1110 -24 1366 184 1416 509 H1148 C1106 320 966 213 776 213 C502 213 338 424 338 744 C338 1066 503 1277 776 1277 C967 1277 1107 1169 1147 979 H1416 C1366 1305 1110 1514 774 1514 C363 1514 72 1212 72 744 C72 279 363 -24 774 -24 Z" transform="translate(0 0)" />
        <path d="M112 0 H364 V598 C364 763 457 846 577 846 C627 846 677 841 696 838 V1062 C676 1064 648 1066 614 1066 C478 1066 397 1002 358 881 H355 V1056 H112 Z" transform="translate(137.7 0)" />
        <path d="M578 -24 C825 -24 1021 119 1061 326 H825 C796 236 711 175 584 175 C414 175 316 290 310 462 H1074 V531 C1074 855 872 1080 568 1080 C272 1080 63 848 63 527 C63 207 261 -24 578 -24 Z M312 636 C329 787 426 880 572 880 C718 880 816 787 832 636 Z" transform="translate(205.3 0)" />
        <path d="M344 0 H604 L734 440 C763 538 789 641 815 744 C842 641 868 538 896 440 L1024 0 H1286 L1613 1056 H1345 L1236 655 C1203 530 1172 396 1142 265 C1109 396 1077 530 1043 655 L932 1056 H699 L587 655 C552 529 520 394 487 263 C455 394 425 529 392 655 L283 1056 H18 Z" transform="translate(310.4 0)" />
        <path d="M364 1490 H112 V0 H364 Z" transform="translate(461.7 0)" />
        <path d="M131 -418 H296 C449 -418 553 -339 616 -174 L1088 1056 H824 L631 506 C604 428 579 350 555 272 C531 350 505 428 479 506 L285 1056 H18 L425 6 L386 -96 C356 -179 324 -213 256 -213 H131 Z" transform="translate(505.9 0)" />
      </g>
    </svg>
  );

  return (
    <Wrapper {...wrapperProps}>
      {iconOnly ? (
        Symbol
      ) : (
        <span className="flex items-center gap-2 group-hover:opacity-90 transition-opacity">
          {Lockup}
          {administrator && (
            <span className="ml-0.5 text-[6px] font-extrabold leading-none tracking-[0.28px] text-primary">ADMINISTRATOR</span>
          )}
        </span>
      )}
    </Wrapper>
  );
}