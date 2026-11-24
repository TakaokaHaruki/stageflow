import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function CrewlyLogo({ className = "", disableLink = false, administrator = false, iconOnly = false, size = 26 }) {
  const { isAuthenticated } = useAuth();
  const Wrapper = disableLink ? "div" : Link;
  const wrapperProps = disableLink
    ? { className: `flex items-center gap-2 select-none shrink-0 group ${className}` }
    : { to: isAuthenticated ? "/home" : "/", className: `flex items-center gap-2 select-none shrink-0 group ${className}`, "aria-label": "Crewly トップへ" };
  // ISCT-inspired deep navy brand mark
  const rectColor = administrator ? "hsl(335 72% 48%)" : "hsl(235 66% 30%)";
  const dotColor = administrator ? "hsl(45 95% 60%)" : "hsl(200 80% 62%)";
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
        <path d="M 18.2 8.3 A 6.5 6.5 0 1 0 18.2 17.7" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <circle cx="18.2" cy="17.7" r="1.7" fill={dotColor} />
      </svg>
      {!iconOnly && (
        <span className="flex flex-col justify-center leading-none group-hover:opacity-80 transition-opacity">
          <span className="text-[15px] font-extrabold tracking-tight leading-none text-foreground">
            Crew<span className="text-primary">ly</span>
          </span>
          {administrator && (
            <span className="mt-0.5 text-[5px] font-extrabold leading-none tracking-[0.28px] text-primary">ADMINISTRATOR</span>
          )}
        </span>
      )}
    </Wrapper>
  );
}