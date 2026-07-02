# GoldenBell 2026

School festival Golden Bell service for roughly 200 students.

## Stack

- Next.js on Vercel
- Firebase Realtime Database for live game state
- Firebase Anonymous Auth for participant sessions
- Firebase Admin SDK for protected admin operations
- TypeScript, ESLint, Vitest

## Product Direction

- Participant flow: game code, then student ID, name, and nickname.
- Game rule: one wrong answer eliminates a participant.
- Revival round: eliminated participants who answer correctly all return.
- Question data is prepared by the developer before the event.
- Stage display shows only public information: current question, timer, survivor count, and reveal state.

## Routes

- `/` - participant entry and answer surface
- `/admin` - operator control surface
- `/stage` - big-screen stage display
- `/api/admin/game` - protected admin mutation endpoint

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Public Firebase client values:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Server-only admin values:

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_DATABASE_URL=
ADMIN_SECRET=
```

`ADMIN_SECRET` must be a random value with at least 32 characters. Do not use a placeholder or a human-readable password. Store it only in `.env.local` and Vercel environment variables.

Example admin request:

```bash
curl -X POST "$APP_URL/api/admin/game" \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"gameId":"festival-2026","action":"start","questionId":"easy-001","timeLimitSeconds":7}'
```

Do not commit `.env.local` or production secrets.

## Firebase Rules

This scaffold includes `firebase.json` and `database.rules.json` so the Realtime Database security posture is versioned. The initial rules split public game display data from sensitive operational data:

- `publicGames/{gameId}` is readable by signed-in participants and contains public state plus sanitized question display data.
- `games/{gameId}` is not broadly readable by clients.
- Participant and answer records are participant-scoped when read access is later needed.
- All direct client writes are denied.
- Admin mutations use the server-only Firebase Admin SDK through `/api/admin/game`.

Deploy rules after selecting the Firebase project:

```bash
firebase use <project-id>
firebase deploy --only database
```

Participant answer writes can later be opened with narrowly scoped rules after the submission API/client contract is finalized. Until then, server-side APIs should write answers and participant state.

## Data Model Draft

```txt
publicGames/{gameId}/state
  code
  status: waiting | running | paused | finished
  phase: lobby | answering | closed | reveal | revival
  currentQuestionId
  startedAt
  timeLimitSeconds
  survivorCount

publicGames/{gameId}/questions/{questionId}
  type: multiple | ox | short | image
  text
  choices
  imagePath
  timeLimitSeconds
  isRevival

games/{gameId}/questions/{questionId}
  answer
  acceptedAnswers

games/{gameId}/participants/{participantId}
  studentId
  name
  nickname
  status: alive | eliminated
  joinedAt
  authUid

games/{gameId}/answers/{questionId}/{participantId}
  value
  normalizedValue
  isCorrect
  submittedAt
  participantAuthUid
```

## Verification

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run audit
```

## MVP Notes

- Multiple choice and OX questions use a 7 second default timer.
- Short-answer questions use per-question timers and accepted answer lists.
- Timer screens calculate remaining time from `startedAt` and `timeLimitSeconds`; the app should not write timer ticks to Firebase every second.
- Before the event, run a rehearsal with at least 20-30 devices on the school Wi-Fi.
