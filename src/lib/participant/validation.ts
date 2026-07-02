import { createHash } from "node:crypto";
import { ServiceError } from "@/lib/services/errors";

export type JoinInput = {
  gameId: string;
  code: string;
  studentId: string;
  name: string;
  nickname: string;
  idToken: string;
};

export type AnswerInput = {
  gameId: string;
  questionId: string;
  participantId: string;
  value: string;
  idToken: string;
};

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const STUDENT_ID_PATTERN = /^[0-9A-Za-z_-]{2,20}$/;

function readString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ServiceError(`${field} is required`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new ServiceError(`${field} is required`);
  }

  return trimmed;
}

export function assertSafeRealtimeId(value: string, field: string): void {
  if (!SAFE_ID_PATTERN.test(value)) {
    throw new ServiceError(`${field} must be a safe 1-64 character slug`);
  }
}

export function parseJoinInput(body: unknown): JoinInput {
  if (!body || typeof body !== "object") {
    throw new ServiceError("Invalid request body");
  }

  const record = body as Record<string, unknown>;
  const input: JoinInput = {
    gameId: readString(record.gameId, "gameId"),
    code: readString(record.code, "code").toUpperCase(),
    studentId: readString(record.studentId, "studentId"),
    name: readString(record.name, "name"),
    nickname: readString(record.nickname, "nickname"),
    idToken: readString(record.idToken, "idToken"),
  };

  assertSafeRealtimeId(input.gameId, "gameId");

  if (!STUDENT_ID_PATTERN.test(input.studentId)) {
    throw new ServiceError("studentId must be 2-20 letters, numbers, underscores, or hyphens");
  }

  if (input.name.length > 20 || input.nickname.length > 20) {
    throw new ServiceError("name and nickname must be 20 characters or fewer");
  }

  return input;
}

export function parseAnswerInput(body: unknown): AnswerInput {
  if (!body || typeof body !== "object") {
    throw new ServiceError("Invalid request body");
  }

  const record = body as Record<string, unknown>;
  const input: AnswerInput = {
    gameId: readString(record.gameId, "gameId"),
    questionId: readString(record.questionId, "questionId"),
    participantId: readString(record.participantId, "participantId"),
    value: readString(record.value, "value"),
    idToken: readString(record.idToken, "idToken"),
  };

  assertSafeRealtimeId(input.gameId, "gameId");
  assertSafeRealtimeId(input.questionId, "questionId");
  assertSafeRealtimeId(input.participantId, "participantId");

  if (input.value.length > 120) {
    throw new ServiceError("value must be 120 characters or fewer");
  }

  return input;
}

export function getParticipantId(studentId: string, name: string): string {
  return createHash("sha256").update(`${studentId}:${name}`).digest("hex").slice(0, 20);
}
