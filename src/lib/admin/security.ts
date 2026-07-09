const MIN_SECRET_LENGTH = 8;
const PLACEHOLDER_SECRETS = new Set(["change-me", "change-me-before-deploy", "admin", "password"]);

export type SecretValidation =
  | { ok: true; secret: string }
  | { ok: false; reason: "missing" | "placeholder" | "too_short" };

export function validateAdminSecret(secret: string | undefined): SecretValidation {
  const trimmed = secret?.trim();

  if (!trimmed) {
    return { ok: false, reason: "missing" };
  }

  if (PLACEHOLDER_SECRETS.has(trimmed.toLowerCase())) {
    return { ok: false, reason: "placeholder" };
  }

  if (trimmed.length < MIN_SECRET_LENGTH) {
    return { ok: false, reason: "too_short" };
  }

  return { ok: true, secret: trimmed };
}

export function isAuthorizedAdminRequest(
  authorizationHeader: string | null,
  configuredSecret: string | undefined,
): boolean {
  const validation = validateAdminSecret(configuredSecret);

  if (!validation.ok || !authorizationHeader?.startsWith("Bearer ")) {
    return false;
  }

  const providedSecret = authorizationHeader.slice("Bearer ".length).trim();
  return providedSecret === validation.secret;
}
