"use client";

import { useEffect, useState } from "react";
import { getRemainingSeconds } from "@/lib/game/timer";

export function TimerBadge({ startedAt, timeLimitSeconds }: { startedAt: number | null; timeLimitSeconds: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  return <strong>{getRemainingSeconds(startedAt, timeLimitSeconds, now)}</strong>;
}
