import { NextResponse } from "next/server";
import { actionPatch, validateAdminCommand } from "@/lib/admin/commands";
import { isAuthorizedAdminRequest, validateAdminSecret } from "@/lib/admin/security";
import { getAdminDatabase } from "@/lib/firebase/admin";
import { privateGameStatePath, publicGameStatePath } from "@/lib/firebase/paths";
import { revealCurrentQuestion } from "@/lib/services/game-service";
import { getErrorMessage, getErrorStatus } from "@/lib/services/errors";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_FAILURES = 8;
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function isRateLimited(clientKey: string, now = Date.now()): boolean {
  const entry = failedAttempts.get(clientKey);

  if (!entry || entry.resetAt <= now) {
    return false;
  }

  return entry.count >= RATE_LIMIT_MAX_FAILURES;
}

function recordFailedAttempt(clientKey: string, now = Date.now()): void {
  const entry = failedAttempts.get(clientKey);

  if (!entry || entry.resetAt <= now) {
    failedAttempts.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }

  failedAttempts.set(clientKey, { ...entry, count: entry.count + 1 });
}

export async function POST(request: Request) {
  const now = Date.now();
  const clientKey = getClientKey(request);
  const secretValidation = validateAdminSecret(process.env.ADMIN_SECRET);

  if (!secretValidation.ok) {
    return NextResponse.json({ error: "Admin secret is not safely configured" }, { status: 500 });
  }

  if (isRateLimited(clientKey, now)) {
    return NextResponse.json({ error: "Too many failed admin attempts" }, { status: 429 });
  }

  if (!isAuthorizedAdminRequest(request.headers.get("authorization"), process.env.ADMIN_SECRET)) {
    recordFailedAttempt(clientKey, now);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateAdminCommand(body && typeof body === "object" ? body : {});

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { command } = validation;
  const db = getAdminDatabase();

  // Reveal runs the resolution sweep (grade everyone, eliminate wrong and
  // non-responders, decide winner/rematch) instead of a plain state patch.
  if (command.action === "reveal") {
    try {
      const reveal = await revealCurrentQuestion(command.gameId);
      return NextResponse.json({ ok: true, reveal });
    } catch (error) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatus(error) });
    }
  }

  const patch: Record<string, unknown> = {
    ...actionPatch[command.action],
    updatedAt: now,
  };

  if (command.action === "start" || command.action === "next") {
    patch.startedAt = now;
    // A fresh question clears the previous reveal so stale answers do not linger.
    patch.revealQuestionId = null;
    patch.revealAnswer = null;
    patch.revealAnswerLabel = null;
    patch.rematch = false;
  }

  if (command.questionId) {
    patch.currentQuestionId = command.questionId;
  }

  if (command.timeLimitSeconds) {
    patch.timeLimitSeconds = command.timeLimitSeconds;
  }

  if (command.phase) {
    patch.phase = command.phase;
  }

  await Promise.all([
    db.ref(privateGameStatePath(command.gameId)).update(patch),
    db.ref(publicGameStatePath(command.gameId)).update(patch),
  ]);

  return NextResponse.json({ ok: true, patch });
}
