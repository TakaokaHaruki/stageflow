import { Link } from "react-router-dom";

export default function CrewlyLogo({ className = "", disableLink = false, administrator = false }) {
  const Wrapper = disableLink ? "div" : Link;
  const wrapperProps = disableLink
    ? { className: `flex items-center gap-1 select-none shrink-0 group ${className}` }
    : { to: "/", className: `flex items-center gap-1 select-none shrink-0 group ${className}`, "aria-label": "Crewly トップへ" };
  return (
    <Wrapper {...wrapperProps}>
      {/* SVG mark: "C" with a pin dot at the tail */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 group-hover:opacity-85 transition-opacity"
      >
        {/* Background rounded square */}
        <rect width="26" height="26" rx="7" fill={administrator ? "hsl(335 72% 48%)" : "hsl(258 90% 66%)"} />

        {/* "C" arc — open to the right, endpoints have dots */}
        {/* Arc: center (13,13), radius 6.5, from ~40° to ~320° */}
        <path
          d="M 18.2 8.3 A 6.5 6.5 0 1 0 18.2 17.7"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Pin dot at the bottom tip of the C */}
        <circle cx="18.2" cy="17.7" r="1.6" fill={administrator ? "hsl(345 95% 78%)" : "hsl(252 95% 86%)"} />
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