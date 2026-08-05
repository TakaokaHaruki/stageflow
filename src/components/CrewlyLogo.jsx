import { Link } from "react-router-dom";

export default function CrewlyLogo({ className = "", disableLink = false, administrator = false }) {
  const Wrapper = disableLink ? "div" : Link;
  const wrapperProps = disableLink
    ? { className: `flex items-center gap-1 select-none shrink-0 group ${className}` }
    : { to: "/", className: `flex items-center gap-1 select-none shrink-0 group ${className}`, "aria-label": "Crewly トップへ" };
  return (
    <Wrapper {...wrapperProps}>
      {/* SVG mark: converging dots — staff coordinating around a central pivot */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 group-hover:opacity-85 transition-opacity"
      >
        {/* Connecting lines from outer dots to the central pivot */}
        <g stroke={administrator ? "hsl(335 72% 48%)" : "hsl(221 83% 53%)"} strokeWidth="1.6" strokeLinecap="round">
          <line x1="13" y1="5" x2="13" y2="13" />
          <line x1="5" y1="18" x2="13" y2="13" />
          <line x1="21" y1="18" x2="13" y2="13" />
        </g>

        {/* Outer dots (triangle formation) */}
        <circle cx="13" cy="5" r="2" fill={administrator ? "hsl(335 72% 48%)" : "hsl(221 83% 53%)"} />
        <circle cx="5" cy="18" r="2" fill={administrator ? "hsl(335 72% 48%)" : "hsl(221 83% 53%)"} />
        <circle cx="21" cy="18" r="2" fill={administrator ? "hsl(335 72% 48%)" : "hsl(221 83% 53%)"} />

        {/* Central pivot */}
        <circle cx="13" cy="13" r="2.8" fill={administrator ? "hsl(345 95% 78%)" : "hsl(213 94% 68%)"} />
      </svg>

      {/* Logotype */}
      <span className="flex flex-col justify-center leading-none group-hover:opacity-80 transition-opacity">
        <span className="text-[14px] font-black tracking-tight leading-none text-foreground">
          Crew
          <span className={administrator ? "" : "text-primary"} style={administrator ? { color: "hsl(335 72% 48%)" } : undefined}>
            ly
          </span>
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