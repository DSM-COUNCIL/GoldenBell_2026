import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { loadDotenv, normalizePrivateKey, validateFirebaseEnv } from "./env-utils.mjs";

loadDotenv();
const validation = validateFirebaseEnv(process.env);

if (!validation.ok) {
  console.error("Firebase environment is not ready. Run `npm run env:check` for details.");
  process.exit(1);
}

const baseUrl = process.env.APP_URL || "http://localhost:3000";
const gameId = process.env.SMOKE_GAME_ID || `smoke-${Date.now()}`;
const code = process.env.SMOKE_GAME_CODE || "SMOKE2026";
const keepData = process.env.SMOKE_KEEP_DATA === "1";
const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY ?? ""),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
const auth = getAuth(app);
const db = getDatabase(app);

async function postJson(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${payload.error ?? text}`);
  }

  return payload;
}

async function createAnonymousUser() {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Anonymous Auth sign-up failed");
  }

  return { uid: payload.localId, idToken: payload.idToken };
}

const adminHeaders = { Authorization: `Bearer ${process.env.ADMIN_SECRET}` };
let anonymousUser;

try {
  anonymousUser = await createAnonymousUser();
  console.log("ok anonymous auth token issued");

  await postJson("/api/admin/seed", { gameId, code }, adminHeaders);
  console.log("ok admin seed API");

  const join = await postJson("/api/participant/join", {
    gameId,
    code,
    studentId: "9999",
    name: "SmokeTester",
    nickname: "Smoke",
    idToken: anonymousUser.idToken,
  });
  console.log("ok participant join API");

  await postJson("/api/admin/game", {
    gameId,
    action: "start",
    questionId: "easy-001",
    timeLimitSeconds: 60,
  }, adminHeaders);
  console.log("ok admin start API");

  const answer = await postJson("/api/participant/answer", {
    gameId,
    questionId: "easy-001",
    participantId: join.participantId,
    value: "1",
    idToken: anonymousUser.idToken,
  });

  if (!answer.answer?.isCorrect) {
    throw new Error("Expected smoke answer to be correct");
  }

  console.log("ok participant answer API");
  console.log(`API smoke passed for ${gameId}.`);
} finally {
  if (anonymousUser?.uid) {
    await auth.deleteUser(anonymousUser.uid).catch(() => undefined);
  }

  if (!keepData) {
    await Promise.all([
      db.ref(`games/${gameId}`).remove(),
      db.ref(`publicGames/${gameId}`).remove(),
    ]).catch(() => undefined);
  }
}
