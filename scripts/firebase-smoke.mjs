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

const db = getDatabase(app);
const auth = getAuth(app);
const runId = `smoke-${Date.now()}`;
const checkRef = db.ref(`connectionChecks/${runId}`);

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
    throw new Error(payload.error?.message ?? "Anonymous Auth smoke failed");
  }

  return { uid: payload.localId, idToken: payload.idToken };
}

try {
  await checkRef.set({ runId, createdAt: Date.now(), source: "scripts/firebase-smoke.mjs" });
  const snapshot = await checkRef.get();

  if (!snapshot.exists() || snapshot.val().runId !== runId) {
    throw new Error("Realtime Database smoke read did not match the write");
  }

  await checkRef.remove();
  console.log("ok Realtime Database admin write/read/delete");

  const anonymousUser = await createAnonymousUser();
  await auth.deleteUser(anonymousUser.uid);
  console.log("ok Firebase Anonymous Auth sign-up/delete");
  console.log("Firebase connection smoke passed.");
} catch (error) {
  await checkRef.remove().catch(() => undefined);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
