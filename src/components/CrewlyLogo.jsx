import { Link } from "react-router-dom";

export default function CrewlyLogo({ className = "", disableLink = false, administrator = false, iconOnly = false, size = 26 }) {
  const Wrapper = disableLink ? "div" : Link;
  const wrapperProps = disableLink
    ? { className: `flex items-center gap-1 select-none shrink-0 group ${className}` }
    : { to: "/", className: `flex items-center gap-1 select-none shrink-0 group ${className}`, "aria-label": "Crewly トップへ" };
  const rectColor = administrator ? "hsl(335 72% 48%)" : "hsl(230 65% 45%)";
  const dotColor = administrator ? "hsl(45 95% 60%)" : "hsl(195 80% 65%)";
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
        <rect width="26" height="26" rx="7" fill={rectColor} />
        <path d="M 18.2 8.3 A 6.5 6.5 0 1 0 18.2 17.7" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <circle cx="18.2" cy="17.7" r="1.6" fill={dotColor} />
      </svg>
      {!iconOnly && (
        <span className="flex flex-col justify-center leading-none group-hover:opacity-80 transition-opacity">
          <span className="text-[14px] font-black tracking-tight leading-none text-foreground">
            Crew<span className={administrator ? "" : "text-primary"} style={administrator ? { color: rectColor } : undefined}>ly</span>
          </span>
          {administrator && (
            <span className="mt-0.5 text-[5px] font-extrabold leading-none tracking-[0.25px]" style={{ color: rectColor }}>ADMINISTRATOR</span>
          )}
        </span>
      )}
    </Wrapper>
  );
}