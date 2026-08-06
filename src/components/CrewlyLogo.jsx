import { Link } from "react-router-dom";

export default function CrewlyLogo({ className = "", disableLink = false, administrator = false }) {
  const Wrapper = disableLink ? "div" : Link;
  const wrapperProps = disableLink
    ? { className: `flex items-center gap-1 select-none shrink-0 group ${className}` }
    : { to: "/", className: `flex items-center gap-1 select-none shrink-0 group ${className}`, "aria-label": "Crewly トップへ" };
  return (
    <Wrapper {...wrapperProps}>
      {/* SVG mark: node network — central ring hub with three outer nodes forming a left-pointing triangle */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 group-hover:opacity-85 transition-opacity"
      >
        {/* Triangle edges (V pointing left): left↔top, left↔bottom — drawn first so the ring sits on top */}
        <g stroke={administrator ? "hsl(335 72% 48%)" : "hsl(221 83% 53%)"} strokeWidth="1.4" strokeLinecap="round">
          <line x1="4.5" y1="13" x2="20" y2="6.5" />
          <line x1="4.5" y1="13" x2="20" y2="19.5" />
        </g>

        {/* Spokes from the central ring to each outer node */}
        <g stroke={administrator ? "hsl(335 72% 48%)" : "hsl(221 83% 53%)"} strokeWidth="1.5" strokeLinecap="round">
          <line x1="10.4" y1="13" x2="6.9" y2="13" />
          <line x1="14.9" y1="11.2" x2="18.2" y2="8.1" />
          <line x1="14.9" y1="14.8" x2="18.2" y2="17.9" />
        </g>

        {/* Outer solid nodes */}
        <circle cx="4.5" cy="13" r="2.4" fill={administrator ? "hsl(335 72% 48%)" : "hsl(221 83% 53%)"} />
        <circle cx="20" cy="6.5" r="2.4" fill={administrator ? "hsl(335 72% 48%)" : "hsl(221 83% 53%)"} />
        <circle cx="20" cy="19.5" r="2.4" fill={administrator ? "hsl(335 72% 48%)" : "hsl(221 83% 53%)"} />

        {/* Central open ring (hub) */}
        <circle cx="13" cy="13" r="2.6" stroke={administrator ? "hsl(335 72% 48%)" : "hsl(221 83% 53%)"} strokeWidth="1.8" fill="none" />
      </svg>

      {/* Logotype */}
      <span className="flex flex-col justify-center leading-none group-hover:opacity-80 transition-opacity">
        <span
          className="text-[14px] font-semibold tracking-tight leading-none"
          style={{ color: administrator ? "hsl(335 72% 48%)" : "hsl(217 33% 17%)" }}
        >
          crewly
        </span>
        {administrator && (
          <span
            className="mt-0.5 text-[5px] font-extrabold leading-none tracking-[0.25px]"
            style={{ color: "hsl(335 72% 48%)" }}
          >
            ADMINISTRATOR
          </span>
        )}
      </span>
    </Wrapper>
  );
}