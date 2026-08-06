import { Link } from "react-router-dom";

export default function CrewlyLogo({ className = "", disableLink = false, administrator = false, iconOnly = false, size = 26 }) {
  const Wrapper = disableLink ? "div" : Link;
  const wrapperProps = disableLink
    ? { className: `flex items-center gap-1 select-none shrink-0 group ${className}` }
    : { to: "/", className: `flex items-center gap-1 select-none shrink-0 group ${className}`, "aria-label": "Crewly トップへ" };
  const color = administrator ? "hsl(335 72% 48%)" : "hsl(221 83% 53%)";
  return (
    <Wrapper {...wrapperProps}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 26 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 group-hover:opacity-85 transition-opacity"
      >
        <g stroke={color} strokeWidth="1.5" strokeLinecap="round">
          <line x1="4.5" y1="13" x2="11" y2="13" />
          <line x1="15" y1="13" x2="20" y2="6.5" />
          <line x1="15" y1="13" x2="20" y2="19.5" />
        </g>
        <circle cx="4.5" cy="13" r="2.4" fill={color} />
        <circle cx="20" cy="6.5" r="2.4" fill={color} />
        <circle cx="20" cy="19.5" r="2.4" fill={color} />
        <circle cx="13" cy="13" r="2.6" stroke={color} strokeWidth="1.8" fill="none" />
      </svg>
      {!iconOnly && (
        <span className="flex flex-col justify-center leading-none group-hover:opacity-80 transition-opacity">
          <span className="text-[14px] font-black tracking-tight leading-none text-foreground">
            Crew
            <span className={administrator ? "" : "text-primary"} style={administrator ? { color } : undefined}>
              ly
            </span>
          </span>
          {administrator && (
            <span
              className="mt-0.5 text-[5px] font-extrabold leading-none tracking-[0.25px]"
              style={{ color }}
            >
              ADMINISTRATOR
            </span>
          )}
        </span>
      )}
    </Wrapper>
  );
}