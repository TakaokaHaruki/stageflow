import { useEffect, useState } from "react";

function getBlinkPhase(eventDate, eventTime, endTime, now) {
  if (!eventDate || !eventTime) return null;

  const normalizedStart = String(eventTime).match(/\d{1,2}:\d{2}/)?.[0];
  if (!normalizedStart) return null;

  const startMs = new Date(`${eventDate}T${normalizedStart}:00+09:00`).getTime();
  if (Number.isNaN(startMs)) return null;

  const endMs = (() => {
    if (endTime) {
      const normalizedEnd = String(endTime).match(/\d{1,2}:\d{2}/)?.[0];
      if (normalizedEnd) {
        const t = new Date(`${eventDate}T${normalizedEnd}:00+09:00`).getTime();
        if (!Number.isNaN(t)) return t;
      }
    }
    return startMs + 60 * 60 * 1000; // fallback: start + 60min
  })();

  const diff = startMs - now;

  if (diff > 30 * 60 * 1000) return null;           // > 30min before: no blink
  if (diff > 5 * 60 * 1000) return "yellow";         // 30min ~ 5min before
  if (diff > 0) return "red";                        // 5min ~ start
  if (now < endMs) return "green";                   // start ~ end
  return null;
}

const PHASE_CLASSES = {
  yellow: "animate-pulse rounded bg-amber-200 px-1 font-semibold text-amber-950 ring-1 ring-amber-500 motion-reduce:animate-none dark:bg-amber-500/30 dark:text-amber-100",
  red:    "animate-pulse rounded bg-red-200 px-1 font-semibold text-red-900 ring-1 ring-red-500 motion-reduce:animate-none dark:bg-red-500/30 dark:text-red-100",
  green:  "animate-pulse rounded bg-green-200 px-1 font-semibold text-green-900 ring-1 ring-green-500 motion-reduce:animate-none dark:bg-green-500/30 dark:text-green-100",
};

const REGION_PHASE_CLASSES = {
  yellow: "animate-pulse !border-amber-500 !bg-amber-200 !text-amber-950 ring-2 ring-amber-500 motion-reduce:animate-none dark:!bg-amber-500/30 dark:!text-amber-100",
  red:    "animate-pulse !border-red-500 !bg-red-200 !text-red-900 ring-2 ring-red-500 motion-reduce:animate-none dark:!bg-red-500/30 dark:!text-red-100",
  green:  "animate-pulse !border-green-500 !bg-green-200 !text-green-900 ring-2 ring-green-500 motion-reduce:animate-none dark:!bg-green-500/30 dark:!text-green-100",
};

export default function EventTimeDisplay({ eventDate, eventTime, endTime, label, className = "", region = false }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const phase = getBlinkPhase(eventDate, eventTime, endTime, now);
  const phaseClass = phase ? (region ? REGION_PHASE_CLASSES[phase] : PHASE_CLASSES[phase]) : "";

  const ariaLabel = phase
    ? `${label} ${eventTime}${phase === "yellow" ? " まもなくです" : phase === "red" ? " 直前です" : phase === "green" ? " 開始中" : ""}`
    : `${label} ${eventTime}`;

  return (
    <span
      className={`${className} ${phaseClass}`}
      aria-label={ariaLabel}
    >
      {label} <time dateTime={`${eventDate || ""}T${eventTime}`}>{eventTime}</time>
    </span>
  );
}
