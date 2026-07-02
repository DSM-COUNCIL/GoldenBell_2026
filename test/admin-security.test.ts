import { describe, expect, it } from "vitest";
import { validateAdminCommand } from "@/lib/admin/commands";
import { isAuthorizedAdminRequest, validateAdminSecret } from "@/lib/admin/security";

describe("admin security", () => {
  it("rejects missing, placeholder, and short admin secrets", () => {
    expect(validateAdminSecret(undefined)).toEqual({ ok: false, reason: "missing" });
    expect(validateAdminSecret("change-me-before-deploy")).toEqual({ ok: false, reason: "placeholder" });
    expect(validateAdminSecret("short-secret")).toEqual({ ok: false, reason: "too_short" });
  });

  it("authorizes only a matching bearer token with a safe configured secret", () => {
    const secret = "0123456789abcdef0123456789abcdef";

    expect(isAuthorizedAdminRequest(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedAdminRequest("Bearer wrong", secret)).toBe(false);
    expect(isAuthorizedAdminRequest(secret, secret)).toBe(false);
  });

  it("rejects unsafe realtime keys before they can become database paths", () => {
    expect(validateAdminCommand({ gameId: "festival-2026", action: "start" }).ok).toBe(true);
    expect(validateAdminCommand({ gameId: "games/festival-2026", action: "start" })).toEqual({
      ok: false,
      error: "gameId must be a safe 1-64 character slug",
    });
    expect(
      validateAdminCommand({ gameId: "festival-2026", action: "next", questionId: "../easy-001" }),
    ).toEqual({ ok: false, error: "questionId must be a safe 1-64 character slug" });
  });

  it("rejects invalid admin actions, phases, and timer ranges", () => {
    expect(validateAdminCommand({ gameId: "festival-2026", action: "delete" })).toEqual({
      ok: false,
      error: "action is invalid",
    });
    expect(validateAdminCommand({ gameId: "festival-2026", action: "start", phase: "scoring" })).toEqual({
      ok: false,
      error: "phase is invalid",
    });
    expect(
      validateAdminCommand({ gameId: "festival-2026", action: "start", timeLimitSeconds: 0 }),
    ).toEqual({ ok: false, error: "timeLimitSeconds must be an integer from 1 to 300" });
  });
});
