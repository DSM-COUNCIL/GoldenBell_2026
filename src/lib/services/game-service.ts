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
  rosterEntryPath,
  rosterPath,
} from "@/lib/firebase/paths";
import { isCorrectAnswer, normalizeAnswer, canAnswerQuestion } from "@/lib/game/rules";
import { resolveRound } from "@/lib/game/resolution";
import type { AnswerSubmission, GameState, Participant, Question } from "@/lib/game/types";
import { toPublicQuestionRecord, toQuestionRecord } from "@/lib/game/public";
import { seedQuestions } from "@/data/questions";
import { buildRosterRecord } from "@/data/roster";
import { getParticipantId, type AnswerInput, type JoinInput } from "@/lib/participant/validation";
import { ServiceError } from "./errors";

export type SeedGameInput = {
  gameId: string;
  code: string;
};

export type JoinResult = {
  participant: Participant;
  participantId: string;
  game: GameState;
};

// Correctness is intentionally NOT returned: results stay hidden until the
// admin reveals the answer, so no student can learn it early by submitting.
export type AnswerResult = {
  submitted: true;
  questionId: string;
};

export type RevealResult = {
  questionId: string;
  correctAnswer: string;
  correctLabel: string;
  survivorCount: number;
  outcome: "continue" | "winner" | "rematch";
  winnerId: string | null;
  winnerNickname: string | null;
  eliminatedCount: number;
  revivedCount: number;
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
    winnerId: null,
    winnerNickname: null,
    revealQuestionId: null,
    revealAnswer: null,
    revealAnswerLabel: null,
    rematch: false,
    updatedAt: Date.now(),
  };
}

async function countSurvivors(gameId: string): Promise<number> {
  const snapshot = await getAdminDatabase().ref(participantsPath(gameId)).get();
  const participants = (snapshot.val() ?? {}) as Record<string, Participant>;

  return Object.values(participants).filter((participant) => participant.status === "alive").length;
}

// Label to show on screen at reveal.
// - Multiple choice: number + text, e.g. "1. 궂은 날씨".
// - OX: just the label (O/X) since the id carries no extra meaning.
// - Short answer: the answer text itself.
function correctAnswerLabel(question: Question): string {
  const choice = question.choices?.find((entry) => entry.id === question.answer);

  if (!choice) {
    return question.answer;
  }

  if (question.type === "ox") {
    return choice.label;
  }

  return `${choice.id}. ${choice.label}`;
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
    [rosterPath(gameId)]: buildRosterRecord(),
  });

  return { game, questionCount: seedQuestions.length, rosterCount: Object.keys(buildRosterRecord()).length };
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

  // Roster check: only students on the registered list may join, and the name
  // must match the roster exactly. Prevents made-up or duplicate identities.
  const rosterSnapshot = await db.ref(rosterEntryPath(input.gameId, input.studentId)).get();

  if (!rosterSnapshot.exists()) {
    throw new ServiceError("등록되지 않은 학번입니다. 명단을 확인해 주세요.", 403);
  }

  if ((rosterSnapshot.val() as string) !== input.name) {
    throw new ServiceError("학번과 이름이 명단과 일치하지 않습니다.", 403);
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

  // Submissions close the moment the admin presses 마감 (phase leaves
  // answering/revival). There is no timer-based cutoff.
  if (game.status !== "running" || (game.phase !== "answering" && game.phase !== "revival")) {
    throw new ServiceError("지금은 답을 제출할 수 없습니다.", 409);
  }

  if (game.currentQuestionId !== input.questionId) {
    throw new ServiceError("This is not the current question", 409);
  }

  if (!canAnswerQuestion(participant, question)) {
    throw new ServiceError("이 문제에 답할 수 있는 대상이 아닙니다.", 409);
  }

  // Grade now but keep it private — the participant's status is not changed
  // until reveal. Re-submitting before 마감 overwrites the previous answer.
  const isCorrect = isCorrectAnswer(question, input.value);
  const now = Date.now();
  const answer: AnswerSubmission & { participantAuthUid: string } = {
    participantId: input.participantId,
    questionId: input.questionId,
    value: input.value,
    normalizedValue: normalizeAnswer(input.value),
    isCorrect,
    submittedAt: now,
    participantAuthUid: authUid,
  };

  await db.ref(answerPath(input.gameId, input.questionId, input.participantId)).set(answer);

  return { submitted: true, questionId: input.questionId };
}

// Reveal + resolve the current question: eliminate wrong/non-responders,
// revive correct answers on revival rounds, expose the correct answer, and
// decide the winner (1 survivor) or a rematch (all survivors eliminated).
export async function revealCurrentQuestion(gameId: string): Promise<RevealResult> {
  const db = getAdminDatabase();
  const game = await readRequired<GameState>(privateGameStatePath(gameId), "Game not found");
  const questionId = game.currentQuestionId;

  if (!questionId) {
    throw new ServiceError("공개할 현재 문제가 없습니다.", 409);
  }

  // Fetch the question, participants, and answers in parallel to cut latency.
  const [question, participantsSnapshot, answersSnapshot] = await Promise.all([
    readRequired<Question>(privateQuestionPath(gameId, questionId), "Question not found"),
    db.ref(participantsPath(gameId)).get(),
    db.ref(answersPath(gameId, questionId)).get(),
  ]);

  const participantsById = (participantsSnapshot.val() ?? {}) as Record<string, Participant>;
  const participants = Object.values(participantsById);
  const answers = (answersSnapshot.val() ?? {}) as Record<string, AnswerSubmission>;

  const correctParticipantIds = new Set(
    Object.entries(answers)
      .filter(([, answer]) => answer.isCorrect)
      .map(([participantId]) => participantId),
  );

  const resolution = resolveRound({ participants, question, correctParticipantIds });

  const winner =
    resolution.winnerId != null ? participantsById[resolution.winnerId] ?? null : null;
  const now = Date.now();

  const statePatch: Record<string, unknown> = {
    phase: "reveal",
    survivorCount: resolution.survivorCount,
    revealQuestionId: questionId,
    revealAnswer: question.answer,
    revealAnswerLabel: correctAnswerLabel(question),
    rematch: resolution.outcome === "rematch",
    winnerId: winner?.id ?? null,
    winnerNickname: winner?.nickname ?? null,
    updatedAt: now,
  };

  if (resolution.outcome === "winner") {
    statePatch.status = "finished";
  }

  const statusUpdates: Record<string, unknown> = {};
  for (const update of resolution.updates) {
    statusUpdates[`${participantPath(gameId, update.participantId)}/status`] = update.status;
  }

  const writes: Promise<unknown>[] = [
    db.ref(privateGameStatePath(gameId)).update(statePatch),
    db.ref(publicGameStatePath(gameId)).update(statePatch),
  ];

  if (Object.keys(statusUpdates).length > 0) {
    writes.push(db.ref().update(statusUpdates));
  }

  await Promise.all(writes);

  return {
    questionId,
    correctAnswer: question.answer,
    correctLabel: correctAnswerLabel(question),
    survivorCount: resolution.survivorCount,
    outcome: resolution.outcome,
    winnerId: winner?.id ?? null,
    winnerNickname: winner?.nickname ?? null,
    eliminatedCount: resolution.updates.filter((update) => update.status === "eliminated").length,
    revivedCount: resolution.updates.filter((update) => update.status === "alive").length,
  };
}

export async function getSubmissionCount(gameId: string, questionId: string): Promise<number> {
  const snapshot = await getAdminDatabase().ref(answersPath(gameId, questionId)).get();
  return snapshot.exists() ? snapshot.numChildren() : 0;
}
