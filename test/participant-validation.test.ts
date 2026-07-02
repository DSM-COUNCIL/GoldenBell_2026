import { describe, expect, it } from "vitest";
import { getParticipantId, parseAnswerInput, parseJoinInput } from "@/lib/participant/validation";

const validJoin = {
  gameId: "festival-2026",
  code: "golden",
  studentId: "10101",
  name: "홍길동",
  nickname: "번개장인",
  idToken: "token",
};

describe("participant validation", () => {
  it("normalizes join code and keeps deterministic participant ids", () => {
    expect(parseJoinInput(validJoin).code).toBe("GOLDEN");
    expect(getParticipantId("10101", "홍길동")).toBe(getParticipantId("10101", "홍길동"));
  });

  it("rejects unsafe realtime ids", () => {
    expect(() => parseJoinInput({ ...validJoin, gameId: "../festival" })).toThrow(
      "gameId must be a safe 1-64 character slug",
    );
    expect(() =>
      parseAnswerInput({ gameId: "festival-2026", questionId: "a/b", participantId: "p1", value: "1", idToken: "token" }),
    ).toThrow("questionId must be a safe 1-64 character slug");
  });

  it("rejects overlong participant display values", () => {
    expect(() => parseJoinInput({ ...validJoin, nickname: "가".repeat(21) })).toThrow(
      "name and nickname must be 20 characters or fewer",
    );
  });
});
