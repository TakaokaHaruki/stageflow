import { Link } from "react-router-dom";

export default function CrewlyLogo({ className = "" }) {
  return (
    <Link
      to="/"
      className={`flex items-center gap-1.5 select-none shrink-0 group ${className}`}
      aria-label="Crewly トップへ"
    >
      <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0 group-hover:opacity-80 transition-opacity">
        <span className="text-[10px] font-black text-primary-foreground tracking-tighter leading-none">Cr</span>
      </div>
      <span className="text-sm font-extrabold tracking-tight text-primary group-hover:opacity-80 transition-opacity">
        Crewly
      </span>
    </Link>
  );
}