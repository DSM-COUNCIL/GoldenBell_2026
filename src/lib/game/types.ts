export type QuestionType = "multiple" | "ox" | "short" | "image";
export type GameStatus = "waiting" | "running" | "paused" | "finished";
export type GamePhase = "lobby" | "answering" | "closed" | "reveal" | "revival";
export type ParticipantStatus = "alive" | "eliminated";

export type Choice = {
  id: string;
  label: string;
};

export type Question = {
  id: string;
  order: number;
  type: QuestionType;
  difficulty: "easy" | "medium" | "hard";
  text: string;
  choices?: Choice[];
  imagePath?: string;
  answer: string;
  acceptedAnswers?: string[];
  timeLimitSeconds: number;
  isRevival?: boolean;
};

export type GameState = {
  id: string;
  code: string;
  status: GameStatus;
  phase: GamePhase;
  currentQuestionId: string | null;
  startedAt: number | null;
  timeLimitSeconds: number;
  survivorCount: number;
  // Winner is decided when exactly one survivor remains.
  winnerId?: string | null;
  winnerNickname?: string | null;
  // Reveal payload. Only the currently revealed answer is exposed publicly;
  // every other answer key stays private.
  revealQuestionId?: string | null;
  revealAnswer?: string | null;
  revealAnswerLabel?: string | null;
  // True when the last question eliminated every survivor and was voided,
  // so the admin should re-run it with the same survivors (rematch).
  rematch?: boolean;
};

export type Participant = {
  id: string;
  studentId: string;
  name: string;
  nickname: string;
  status: ParticipantStatus;
  joinedAt: number;
  authUid?: string;
};

export type AnswerSubmission = {
  participantId: string;
  questionId: string;
  value: string;
  normalizedValue: string;
  isCorrect: boolean;
  submittedAt: number;
};

export type JoinForm = {
  code: string;
  studentId: string;
  name: string;
  nickname: string;
};
