import type { GamePhase, GameStatus } from "@/lib/game/types";

export type AdminAction = "start" | "pause" | "resume" | "close" | "reveal" | "next" | "finish";

export type AdminRequestBody = {
  gameId?: unknown;
  action?: unknown;
  questionId?: unknown;
  timeLimitSeconds?: unknown;
  phase?: unknown;
};

export type ValidAdminCommand = {
  gameId: string;
  action: AdminAction;
  questionId?: string;
  timeLimitSeconds?: number;
  phase?: GamePhase;
};

export type CommandValidation =
  | { ok: true; command: ValidAdminCommand }
  | { ok: false; error: string };

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const ADMIN_ACTIONS = ["start", "pause", "resume", "close", "reveal", "next", "finish"] as const;
export const GAME_PHASES = ["lobby", "answering", "closed", "reveal", "revival"] as const;

export const actionPatch: Record<AdminAction, Partial<{ status: GameStatus; phase: GamePhase }>> = {
  start: { status: "running", phase: "answering" },
  pause: { status: "paused" },
  resume: { status: "running" },
  close: { phase: "closed" },
  reveal: { phase: "reveal" },
  next: { status: "running", phase: "answering" },
  finish: { status: "finished" },
};

export function isSafeRealtimeId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID_PATTERN.test(value);
}

function isAdminAction(value: unknown): value is AdminAction {
  return typeof value === "string" && ADMIN_ACTIONS.includes(value as AdminAction);
}

function isGamePhase(value: unknown): value is GamePhase {
  return typeof value === "string" && GAME_PHASES.includes(value as GamePhase);
}

function isValidTimeLimit(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 300;
}

export function validateAdminCommand(body: AdminRequestBody): CommandValidation {
  if (!isSafeRealtimeId(body.gameId)) {
    return { ok: false, error: "gameId must be a safe 1-64 character slug" };
  }

  if (!isAdminAction(body.action)) {
    return { ok: false, error: "action is invalid" };
  }

  if (body.questionId !== undefined && !isSafeRealtimeId(body.questionId)) {
    return { ok: false, error: "questionId must be a safe 1-64 character slug" };
  }

  if (body.timeLimitSeconds !== undefined && !isValidTimeLimit(body.timeLimitSeconds)) {
    return { ok: false, error: "timeLimitSeconds must be an integer from 1 to 300" };
  }

  if (body.phase !== undefined && !isGamePhase(body.phase)) {
    return { ok: false, error: "phase is invalid" };
  }

  return {
    ok: true,
    command: {
      gameId: body.gameId,
      action: body.action,
      questionId: body.questionId,
      timeLimitSeconds: body.timeLimitSeconds,
      phase: body.phase,
    },
  };
}
