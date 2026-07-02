import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rules = JSON.parse(readFileSync("database.rules.json", "utf8")) as {
  rules: Record<string, Record<string, Record<string, unknown>>>;
};

describe("firebase realtime database rules", () => {
  it("keeps sensitive game subtree closed by default", () => {
    const privateGameRules = rules.rules.games.$gameId;

    expect(privateGameRules[".read"]).toBe(false);
    expect(privateGameRules[".write"]).toBe(false);
    expect((privateGameRules.questions as Record<string, unknown>)[".read"]).toBe(false);
  });

  it("does not grant broad reads at public game root", () => {
    const publicGameRules = rules.rules.publicGames.$gameId;

    expect(publicGameRules[".read"]).toBeUndefined();
    expect(publicGameRules[".write"]).toBe(false);
  });

  it("exposes only public state and sanitized public questions to authenticated clients", () => {
    const publicGameRules = rules.rules.publicGames.$gameId;

    expect((publicGameRules.state as Record<string, unknown>)[".read"]).toBe("auth != null");
    expect((publicGameRules.questions as Record<string, unknown>)[".read"]).toBe("auth != null");
    expect((publicGameRules.questions as Record<string, unknown>)[".write"]).toBe(false);
  });
});
