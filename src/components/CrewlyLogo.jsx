import { Link } from "react-router-dom";

export default function CrewlyLogo({ className = "" }) {
  return (
    <Link
      to="/"
      className={`flex items-center gap-2 select-none shrink-0 group ${className}`}
      aria-label="Crewly トップへ"
    >
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
        <rect width="26" height="26" rx="7" fill="hsl(230 65% 45%)" />

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
        <circle cx="18.2" cy="17.7" r="1.6" fill="hsl(195 80% 65%)" />
      </svg>

      {/* Logotype */}
      <span className="text-[14px] font-black tracking-tight leading-none text-foreground group-hover:opacity-80 transition-opacity">
        Crew<span className="text-primary">ly</span>
      </span>
    </Link>
  );
}