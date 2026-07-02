import { describe, expect, it } from "vitest";
import { seedQuestions } from "@/data/questions";
import { toPublicQuestion, toPublicQuestionRecord } from "@/lib/game/public";

describe("public questions", () => {
  it("removes answer keys from public question payloads", () => {
    const publicQuestion = toPublicQuestion(seedQuestions[1]);

    expect("answer" in publicQuestion).toBe(false);
    expect("acceptedAnswers" in publicQuestion).toBe(false);
  });

  it("creates public question records without accepted answers", () => {
    const record = toPublicQuestionRecord(seedQuestions);

    const serialized = JSON.stringify(record);

    expect(Object.keys(record).length).toBe(seedQuestions.length);
    expect(serialized).not.toContain('"answer"');
    expect(serialized).not.toContain("acceptedAnswers");
  });
});
