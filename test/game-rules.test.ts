import { describe, expect, it } from "vitest";
import { canAnswerQuestion, getNextStatus, isCorrectAnswer, normalizeAnswer } from "@/lib/game/rules";
import { getRemainingSeconds } from "@/lib/game/timer";
import type { Participant, Question } from "@/lib/game/types";

const shortQuestion: Question = {
  id: "q1",
  order: 1,
  type: "short",
  difficulty: "easy",
  text: "미국의 수도는?",
  answer: "워싱턴 D.C.",
  acceptedAnswers: ["워싱턴 D.C.", "워싱턴 DC", "워싱턴디씨"],
  timeLimitSeconds: 12,
};

const aliveParticipant: Participant = {
  id: "p1",
  studentId: "10101",
  name: "홍길동",
  nickname: "번개장인",
  status: "alive",
  joinedAt: 0,
};

const eliminatedParticipant: Participant = {
  ...aliveParticipant,
  id: "p2",
  status: "eliminated",
};

describe("game rules", () => {
  it("normalizes spacing, dots, case, and punctuation for short answers", () => {
    expect(normalizeAnswer(" Washington D.C. ")).toBe("washingtondc");
    expect(isCorrectAnswer(shortQuestion, "워싱턴 DC")).toBe(true);
    expect(isCorrectAnswer(shortQuestion, "워싱턴디씨")).toBe(true);
  });

  it("keeps eliminated participants out of normal rounds", () => {
    expect(canAnswerQuestion(aliveParticipant, shortQuestion)).toBe(true);
    expect(canAnswerQuestion(eliminatedParticipant, shortQuestion)).toBe(false);
  });

  it("allows eliminated participants to answer revival rounds and return on correct answers", () => {
    const revivalQuestion = { ...shortQuestion, isRevival: true };

    expect(canAnswerQuestion(eliminatedParticipant, revivalQuestion)).toBe(true);
    expect(getNextStatus(eliminatedParticipant, revivalQuestion, true)).toBe("alive");
    expect(getNextStatus(eliminatedParticipant, revivalQuestion, false)).toBe("eliminated");
  });

  it("computes remaining time from start timestamp without database ticks", () => {
    expect(getRemainingSeconds(1_000, 7, 4_100)).toBe(4);
    expect(getRemainingSeconds(1_000, 7, 9_500)).toBe(0);
  });
});
