import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rules = JSON.parse(readFileSync("database.rules.json", "utf8")) as {
  rules: Record<string, Record<string, unknown>>;
};

describe("firebase realtime database rules", () => {
  it("keeps sensitive game subtree closed by default", () => {
    const privateGameRules = rules.rules.games.$gameId as Record<string, unknown>;

    expect(privateGameRules[".read"]).toBe(false);
    expect(privateGameRules[".write"]).toBe(false);
  });

  it("exposes only the public game mirror to authenticated clients", () => {
    const publicGameRules = rules.rules.publicGames.$gameId as Record<string, unknown>;

    expect(publicGameRules[".read"]).toBe("auth != null");
    expect(publicGameRules[".write"]).toBe(false);
  });

  it("hides answer keys from public questions", () => {
    const publicGameRules = rules.rules.publicGames.$gameId as Record<string, Record<string, unknown>>;
    const questionRules = publicGameRules.questions.$questionId as Record<string, Record<string, unknown>>;

    expect(questionRules.answer[".read"]).toBe(false);
    expect(questionRules.acceptedAnswers[".read"]).toBe(false);
  });
});
