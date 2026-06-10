import { useEffect, useState } from "react";

const ALERT_BEFORE_MS = 30 * 60 * 1000;
const ALERT_AFTER_MS = 5 * 60 * 1000;

function isNearEventTime(eventDate, eventTime, now) {
  if (!eventDate || !eventTime) return false;

  const normalizedTime = String(eventTime).match(/\d{1,2}:\d{2}/)?.[0];
  if (!normalizedTime) return false;

  const target = new Date(`${eventDate}T${normalizedTime}:00+09:00`);
  if (Number.isNaN(target.getTime())) return false;

  const difference = target.getTime() - now;
  return difference <= ALERT_BEFORE_MS && difference >= -ALERT_AFTER_MS;
}

export default function EventTimeDisplay({ eventDate, eventTime, label, className = "" }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const isNear = isNearEventTime(eventDate, eventTime, now);

  return (
    <span
      className={`${className} ${
        isNear
          ? "animate-pulse rounded bg-amber-200 px-1 font-semibold text-amber-950 ring-1 ring-amber-500 motion-reduce:animate-none dark:bg-amber-500/30 dark:text-amber-100"
          : ""
      }`}
      aria-label={`${label} ${eventTime}${isNear ? " まもなくです" : ""}`}
    >
      {label} <time dateTime={`${eventDate || ""}T${eventTime}`}>{eventTime}</time>
    </span>
  );
}
