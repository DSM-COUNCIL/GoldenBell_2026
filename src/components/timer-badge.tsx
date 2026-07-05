"use client";

import { useEffect, useState } from "react";
import { getRemainingSeconds } from "@/lib/game/timer";

export function TimerBadge({ startedAt, timeLimitSeconds }: { startedAt: number | null; timeLimitSeconds: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remaining = getRemainingSeconds(startedAt, timeLimitSeconds, now);
  const running = startedAt != null && timeLimitSeconds > 0;
  const className = running && remaining <= 3 && remaining > 0 ? "timer-low" : running && remaining === 0 ? "timer-done" : "";

  return <strong className={className}>{remaining}</strong>;
}
