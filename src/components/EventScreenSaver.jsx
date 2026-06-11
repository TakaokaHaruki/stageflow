import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import CrewlyLogo from "@/components/CrewlyLogo";
import EventTimeDisplay from "@/components/EventTimeDisplay";

const EVENT_TIMES = [
  { key: "time_priority", endKey: "time_priority_end", label: "先行" },
  { key: "time_open", endKey: "time_open_end", label: "開場" },
  { key: "time_start", endKey: "time_start_end", label: "開演" },
  { key: "time_end", endKey: "time_end_end", label: "終演" },
];

function formatCurrentTime() {
  return new Date().toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function EventScreenSaver({ event, onExit, administrator = false }) {
  const [currentTime, setCurrentTime] = useState(formatCurrentTime);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const wakeLockRef = useRef(null);
  const tapCountRef = useRef(0);
  const tapResetTimerRef = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(formatCurrentTime()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        wakeLockRef.current = await navigator.wakeLock?.request("screen");
      } catch {
        wakeLockRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !wakeLockRef.current) requestWakeLock();
    };

    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => () => window.clearTimeout(tapResetTimerRef.current), []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen is optional and may be blocked by the browser.
    }
  };

  const visibleTimes = EVENT_TIMES.filter(({ key }) => event[key]);

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapResetTimerRef.current) window.clearTimeout(tapResetTimerRef.current);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      try {
        if (document.fullscreenElement) document.exitFullscreen();
      } catch {
        // ignore
      }
      onExit();
      return;
    }

    tapResetTimerRef.current = window.setTimeout(() => {
      tapCountRef.current = 0;
    }, 2_000);
  };

  return (
    <section className="fixed inset-0 z-[70] flex min-h-screen flex-col overflow-y-auto bg-background text-foreground safe-area-top safe-area-bottom">
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground backdrop-blur-md transition-colors hover:bg-muted hover:text-foreground"
          aria-label={isFullscreen ? "全画面表示を終了" : "全画面表示"}
          title={isFullscreen ? "全画面表示を終了" : "全画面表示"}
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-1 flex-col items-center justify-center gap-8 px-4 py-16 sm:gap-12">
        <div
          className="flex h-20 touch-none select-none items-center justify-center sm:h-24 cursor-pointer"
          onClick={handleLogoTap}
        >
          <CrewlyLogo disableLink administrator={administrator} className="scale-[2.8] sm:scale-[3.6]" />
        </div>

        <div className="text-center">
          <div className="mb-1 text-xs font-medium text-muted-foreground sm:text-sm">現在時刻</div>
          <time
            className="font-mono text-6xl font-bold tabular-nums tracking-normal sm:text-8xl lg:text-9xl"
            dateTime={currentTime}
          >
            {currentTime}
          </time>
        </div>

        {visibleTimes.length > 0 && (
          <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
            {visibleTimes.map(({ key, endKey, label }) => (
              <EventTimeDisplay
                key={key}
                eventDate={event.date}
                eventTime={event[key]}
                endTime={event[endKey]}
                label={label}
                region
                className="flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-md border border-border bg-card px-2 py-4 text-xl font-semibold sm:min-h-32 sm:text-2xl [&_time]:text-3xl [&_time]:font-bold [&_time]:tabular-nums sm:[&_time]:text-4xl"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
