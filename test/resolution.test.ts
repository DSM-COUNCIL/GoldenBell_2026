import { describe, expect, it } from "vitest";
import { resolveRound } from "@/lib/game/resolution";
import type { Participant, Question } from "@/lib/game/types";

const normalQuestion: Question = {
  id: "q1",
  order: 1,
  type: "multiple",
  difficulty: "easy",
  text: "예시 문제",
  answer: "1",
  timeLimitSeconds: 7,
};

const revivalQuestion: Question = { ...normalQuestion, id: "r1", isRevival: true };

function participant(id: string, status: Participant["status"]): Participant {
  return { id, studentId: id, name: id, nickname: id, status, joinedAt: 0 };
}

describe("resolveRound", () => {
  it("eliminates alive players who answered wrong or did not answer", () => {
    const participants = [
      participant("correct", "alive"),
      participant("wrong", "alive"),
      participant("silent", "alive"),
    ];

    const result = resolveRound({
      participants,
      question: normalQuestion,
      correctParticipantIds: new Set(["correct"]),
    });

    expect(result.outcome).toBe("winner");
    expect(result.survivorCount).toBe(1);
    expect(result.winnerId).toBe("correct");
    expect(result.updates).toEqual(
      expect.arrayContaining([
        { participantId: "wrong", status: "eliminated" },
        { participantId: "silent", status: "eliminated" },
      ]),
    );
    // The correct player did not change status, so no update for them.
    expect(result.updates.find((u) => u.participantId === "correct")).toBeUndefined();
  });

  it("keeps the game going when more than one survivor remains", () => {
    const participants = [
      participant("a", "alive"),
      participant("b", "alive"),
      participant("c", "alive"),
    ];

    const result = resolveRound({
      participants,
      question: normalQuestion,
      correctParticipantIds: new Set(["a", "b"]),
    });

    expect(result.outcome).toBe("continue");
    expect(result.survivorCount).toBe(2);
    expect(result.winnerId).toBeNull();
  });

  it("voids the question as a rematch when every survivor is eliminated", () => {
    const participants = [participant("a", "alive"), participant("b", "alive")];

    const result = resolveRound({
      participants,
      question: normalQuestion,
      correctParticipantIds: new Set(),
    });

    expect(result.outcome).toBe("rematch");
    expect(result.survivorCount).toBe(2);
    expect(result.updates).toEqual([]);
  });

  it("revives only eliminated players who answered the revival question correctly", () => {
    const participants = [
      participant("alive", "alive"),
      participant("revived", "eliminated"),
      participant("stillOut", "eliminated"),
    ];

    const result = resolveRound({
      participants,
      question: revivalQuestion,
      correctParticipantIds: new Set(["revived"]),
    });

    expect(result.outcome).toBe("continue");
    expect(result.survivorCount).toBe(2);
    expect(result.updates).toEqual([{ participantId: "revived", status: "alive" }]);
  });
});
