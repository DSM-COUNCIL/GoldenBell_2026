# Firebase Connection Runbook

This project uses Firebase Realtime Database for live state and Firebase Anonymous Auth for student sessions. Keep production secrets out of git; use `.env.local` locally and Vercel environment variables in deployment.

## 1. Firebase Console Setup

1. Create or select the Firebase project for `GoldenBell_2026`.
2. Enable Realtime Database.
   - Start in locked mode.
   - Copy the database URL into both `FIREBASE_DATABASE_URL` and `NEXT_PUBLIC_FIREBASE_DATABASE_URL`.
3. Enable Authentication > Sign-in method > Anonymous.
4. Create a service account key.
   - Project settings > Service accounts > Generate new private key.
   - Put `project_id`, `client_email`, and `private_key` into `.env.local`.
   - Store `FIREBASE_PRIVATE_KEY` as one line with escaped `\n` characters.
5. Generate `ADMIN_SECRET` with at least 32 random characters.

## 2. Local `.env.local`

Copy `.env.example` to `.env.local` and fill every Firebase value.

```bash
cp .env.example .env.local
npm run env:check
```

`npm run env:check` prints only presence/shape checks. It does not print secret values.

## 3. Firebase CLI Rules Deployment

Select the project locally, then deploy database rules.

```bash
firebase login
firebase use <project-id>
firebase deploy --only database
```

The deployed rules should match `database.rules.json`:

- participants can read only `publicGames/{gameId}/state` and sanitized `publicGames/{gameId}/questions` after anonymous auth.
- private game state, answer keys, participant records, and answer records stay under `games/{gameId}`.
- direct client writes are denied; API routes write through Firebase Admin SDK.

## 4. Connection Smoke Tests

Run the direct Firebase smoke first. It checks Admin SDK database access and Anonymous Auth sign-up/delete.

```bash
npm run smoke:firebase
```

Then run the app API smoke with the dev server running in another terminal.

```bash
npm run dev
npm run smoke:api
```

The API smoke performs:

1. anonymous auth token issue
2. `/api/admin/seed`
3. `/api/participant/join`
4. `/api/admin/game` start for `easy-001`
5. `/api/participant/answer` with the correct answer
6. cleanup of the smoke game data unless `SMOKE_KEEP_DATA=1`

Optional variables:

```bash
APP_URL=http://localhost:3000
SMOKE_GAME_ID=smoke-manual
SMOKE_GAME_CODE=SMOKE2026
SMOKE_KEEP_DATA=1
```

## 5. Vercel Environment Variables

Set these values for Production and Preview unless you intentionally separate environments.

```txt
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_DATABASE_URL
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_DATABASE_URL
ADMIN_SECRET
```

After Vercel env vars are set, redeploy and run `npm run smoke:api` against the deployed URL:

```bash
APP_URL=https://<vercel-domain> npm run smoke:api
```

## 6. Event Readiness Boundary

This setup verifies the real Firebase connection and app API behavior. The 200-student rehearsal is a separate load/readiness task and should include many devices on the school Wi-Fi plus a few LTE/5G devices.
