import { getAdminAuth, getAdminDatabase } from "@/lib/firebase/admin";
import {
  answerPath,
  answersPath,
  participantPath,
  participantsPath,
  privateGameStatePath,
  privateQuestionsPath,
  privateQuestionPath,
  publicGameStatePath,
  publicQuestionsPath,
} from "@/lib/firebase/paths";
import { getNextStatus, isCorrectAnswer, normalizeAnswer, canAnswerQuestion } from "@/lib/game/rules";
import { isQuestionExpired } from "@/lib/game/timer";
import type { AnswerSubmission, GameState, Participant, Question } from "@/lib/game/types";
import { toPublicQuestionRecord, toQuestionRecord } from "@/lib/game/public";
import { seedQuestions } from "@/data/questions";
import { getParticipantId, type AnswerInput, type JoinInput } from "@/lib/participant/validation";
import { ServiceError } from "./errors";

const SUBMISSION_GRACE_MS = 1_500;

export type SeedGameInput = {
  gameId: string;
  code: string;
};

export type JoinResult = {
  participant: Participant;
  participantId: string;
  game: GameState;
};

export type AnswerResult = {
  answer: AnswerSubmission;
  participant: Participant;
  survivorCount: number;
};

async function verifyIdToken(idToken: string): Promise<string> {
  const decoded = await getAdminAuth().verifyIdToken(idToken);
  return decoded.uid;
}

async function readRequired<T>(path: string, message: string): Promise<T> {
  const snapshot = await getAdminDatabase().ref(path).get();

  if (!snapshot.exists()) {
    throw new ServiceError(message, 404);
  }

  return snapshot.val() as T;
}

function buildInitialGameState(gameId: string, code: string): GameState & { updatedAt: number } {
  const firstQuestion = seedQuestions[0];

  return {
    id: gameId,
    code: code.toUpperCase(),
    status: "waiting",
    phase: "lobby",
    currentQuestionId: firstQuestion?.id ?? null,
    startedAt: null,
    timeLimitSeconds: firstQuestion?.timeLimitSeconds ?? 7,
    survivorCount: 0,
    updatedAt: Date.now(),
  };
}

async function countSurvivors(gameId: string): Promise<number> {
  const snapshot = await getAdminDatabase().ref(participantsPath(gameId)).get();
  const participants = (snapshot.val() ?? {}) as Record<string, Participant>;

  return Object.values(participants).filter((participant) => participant.status === "alive").length;
}

export async function seedGame({ gameId, code }: SeedGameInput) {
  const db = getAdminDatabase();
  const game = buildInitialGameState(gameId, code);
  const privateQuestions = toQuestionRecord(seedQuestions);
  const publicQuestions = toPublicQuestionRecord(seedQuestions);

  await db.ref().update({
    [privateGameStatePath(gameId)]: game,
    [privateQuestionsPath(gameId)]: privateQuestions,
    [publicGameStatePath(gameId)]: game,
    [publicQuestionsPath(gameId)]: publicQuestions,
  });

  return { game, questionCount: seedQuestions.length };
}

export async function joinParticipant(input: JoinInput): Promise<JoinResult> {
  const authUid = await verifyIdToken(input.idToken);
  const db = getAdminDatabase();
  const game = await readRequired<GameState>(publicGameStatePath(input.gameId), "Game not found");

  if (game.code !== input.code) {
    throw new ServiceError("Invalid game code", 403);
  }

  if (game.status === "finished") {
    throw new ServiceError("Game is already finished", 409);
  }

  const participantId = getParticipantId(input.studentId, input.name);
  const ref = db.ref(participantPath(input.gameId, participantId));
  const snapshot = await ref.get();
  const existing = snapshot.val() as Participant | null;
  const now = Date.now();

  if (existing?.authUid && existing.authUid !== authUid) {
    throw new ServiceError("This student identity is already joined on another device", 409);
  }

  if (!existing && game.status !== "waiting") {
    throw new ServiceError("Game has already started", 409);
  }

  const participant: Participant = {
    id: participantId,
    studentId: input.studentId,
    name: input.name,
    nickname: input.nickname,
    status: existing?.status ?? "alive",
    joinedAt: existing?.joinedAt ?? now,
    authUid,
  };

  await ref.set(participant);
  const survivorCount = await countSurvivors(input.gameId);
  await Promise.all([
    db.ref(privateGameStatePath(input.gameId)).update({ survivorCount, updatedAt: now }),
    db.ref(publicGameStatePath(input.gameId)).update({ survivorCount, updatedAt: now }),
  ]);

  return { participant, participantId, game: { ...game, survivorCount } };
}

export async function submitAnswer(input: AnswerInput): Promise<AnswerResult> {
  const authUid = await verifyIdToken(input.idToken);
  const db = getAdminDatabase();
  const [game, question, participant] = await Promise.all([
    readRequired<GameState>(publicGameStatePath(input.gameId), "Game not found"),
    readRequired<Question>(privateQuestionPath(input.gameId, input.questionId), "Question not found"),
    readRequired<Participant>(participantPath(input.gameId, input.participantId), "Participant not found"),
  ]);

  if (participant.authUid !== authUid) {
    throw new ServiceError("Participant token does not match", 403);
  }

  if (game.status !== "running" || (game.phase !== "answering" && game.phase !== "revival")) {
    throw new ServiceError("Question is not accepting answers", 409);
  }

  if (game.currentQuestionId !== input.questionId) {
    throw new ServiceError("This is not the current question", 409);
  }

  if (!canAnswerQuestion(participant, question)) {
    throw new ServiceError("Participant cannot answer this question", 409);
  }

  if (isQuestionExpired(game.startedAt, game.timeLimitSeconds, Date.now() - SUBMISSION_GRACE_MS)) {
    throw new ServiceError("Question time is over", 409);
  }

  const existingAnswer = await db.ref(answerPath(input.gameId, input.questionId, input.participantId)).get();

  if (existingAnswer.exists()) {
    throw new ServiceError("Answer already submitted", 409);
  }

  const isCorrect = isCorrectAnswer(question, input.value);
  const now = Date.now();
  const nextStatus = getNextStatus(participant, question, isCorrect);
  const nextParticipant: Participant = { ...participant, status: nextStatus };
  const answer: AnswerSubmission & { participantAuthUid: string } = {
    participantId: input.participantId,
    questionId: input.questionId,
    value: input.value,
    normalizedValue: normalizeAnswer(input.value),
    isCorrect,
    submittedAt: now,
    participantAuthUid: authUid,
  };

  await db.ref().update({
    [answerPath(input.gameId, input.questionId, input.participantId)]: answer,
    [participantPath(input.gameId, input.participantId)]: nextParticipant,
  });

  const survivorCount = await countSurvivors(input.gameId);
  await Promise.all([
    db.ref(privateGameStatePath(input.gameId)).update({ survivorCount, updatedAt: now }),
    db.ref(publicGameStatePath(input.gameId)).update({ survivorCount, updatedAt: now }),
  ]);

  return { answer, participant: nextParticipant, survivorCount };
}

export async function getSubmissionCount(gameId: string, questionId: string): Promise<number> {
  const snapshot = await getAdminDatabase().ref(answersPath(gameId, questionId)).get();
  return snapshot.exists() ? snapshot.numChildren() : 0;
}
