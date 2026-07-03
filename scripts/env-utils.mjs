import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_PUBLIC = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const REQUIRED_ADMIN = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_DATABASE_URL",
  "ADMIN_SECRET",
];

const PLACEHOLDER_SECRETS = new Set(["change-me", "change-me-before-deploy", "admin", "password"]);

export const REQUIRED_ENV = [...REQUIRED_PUBLIC, ...REQUIRED_ADMIN];

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function loadDotenv(filePath = ".env.local") {
  const absolutePath = resolve(process.cwd(), filePath);

  if (!existsSync(absolutePath)) {
    return { path: absolutePath, loaded: false, values: {} };
  }

  const values = {};
  const text = readFileSync(absolutePath, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripQuotes(line.slice(separatorIndex + 1));

    if (!process.env[key]) {
      process.env[key] = value;
    }

    values[key] = value;
  }

  return { path: absolutePath, loaded: true, values };
}

function valueOf(env, key) {
  return env[key] ?? process.env[key] ?? "";
}

export function normalizePrivateKey(privateKey) {
  return privateKey.replace(/\\n/g, "\n");
}

export function validateFirebaseEnv(env = process.env) {
  const errors = [];
  const warnings = [];

  for (const key of REQUIRED_ENV) {
    if (!valueOf(env, key).trim()) {
      errors.push(`${key} is missing`);
    }
  }

  const adminProjectId = valueOf(env, "FIREBASE_PROJECT_ID");
  const publicProjectId = valueOf(env, "NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const adminDatabaseUrl = valueOf(env, "FIREBASE_DATABASE_URL");
  const publicDatabaseUrl = valueOf(env, "NEXT_PUBLIC_FIREBASE_DATABASE_URL");
  const privateKey = normalizePrivateKey(valueOf(env, "FIREBASE_PRIVATE_KEY"));
  const clientEmail = valueOf(env, "FIREBASE_CLIENT_EMAIL");
  const adminSecret = valueOf(env, "ADMIN_SECRET").trim();

  if (adminProjectId && publicProjectId && adminProjectId !== publicProjectId) {
    errors.push("FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_PROJECT_ID must match");
  }

  if (adminDatabaseUrl && publicDatabaseUrl && adminDatabaseUrl !== publicDatabaseUrl) {
    errors.push("FIREBASE_DATABASE_URL and NEXT_PUBLIC_FIREBASE_DATABASE_URL must match");
  }

  for (const [key, value] of [
    ["FIREBASE_DATABASE_URL", adminDatabaseUrl],
    ["NEXT_PUBLIC_FIREBASE_DATABASE_URL", publicDatabaseUrl],
  ]) {
    if (value && !/^https:\/\/.+\.(firebaseio\.com|firebasedatabase\.app)\/?$/.test(value)) {
      warnings.push(`${key} should look like a Firebase Realtime Database URL`);
    }
  }

  if (clientEmail && !/^[^@]+@[^@]+\.iam\.gserviceaccount\.com$/.test(clientEmail)) {
    warnings.push("FIREBASE_CLIENT_EMAIL should be a service-account email");
  }

  if (privateKey && (!privateKey.includes("-----BEGIN PRIVATE KEY-----") || !privateKey.includes("-----END PRIVATE KEY-----"))) {
    errors.push("FIREBASE_PRIVATE_KEY must include a valid private key block");
  }

  if (adminSecret && adminSecret.length < 32) {
    errors.push("ADMIN_SECRET must be at least 32 characters");
  }

  if (adminSecret && PLACEHOLDER_SECRETS.has(adminSecret.toLowerCase())) {
    errors.push("ADMIN_SECRET must not be a placeholder");
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function summarizeEnv(env = process.env) {
  return REQUIRED_ENV.map((key) => ({ key, present: Boolean(valueOf(env, key).trim()) }));
}
