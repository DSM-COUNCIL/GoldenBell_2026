export function getRemainingSeconds(
  startedAt: number | null,
  timeLimitSeconds: number,
  now = Date.now(),
): number {
  if (!startedAt || timeLimitSeconds <= 0) {
    return 0;
  }

  const elapsedSeconds = Math.floor((now - startedAt) / 1000);
  return Math.max(0, timeLimitSeconds - elapsedSeconds);
}

export function isQuestionExpired(
  startedAt: number | null,
  timeLimitSeconds: number,
  now = Date.now(),
): boolean {
  return getRemainingSeconds(startedAt, timeLimitSeconds, now) === 0;
}
