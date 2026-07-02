import type { Participant } from "@/lib/game/types";

export type StoredParticipantSession = {
  gameId: string;
  participantId: string;
  participant: Participant;
};

const STORAGE_KEY = "goldenbell.participant";

export function saveParticipantSession(session: StoredParticipantSession): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadParticipantSession(): StoredParticipantSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredParticipantSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
