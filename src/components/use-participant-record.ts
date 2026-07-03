"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { ensureAnonymousSession, getFirebaseDatabase, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { participantPath } from "@/lib/firebase/paths";
import type { Participant } from "@/lib/game/types";

// Subscribes to the signed-in student's own participant record so their
// status (alive / eliminated) updates live at reveal time. Database rules
// only allow reading a record whose authUid matches the caller.
export function useParticipantRecord(
  gameId: string,
  participantId: string | null,
): Participant | null {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const configured = isFirebaseClientConfigured();

  useEffect(() => {
    if (!configured || !gameId || !participantId) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    ensureAnonymousSession()
      .then(() => {
        if (cancelled) {
          return;
        }

        const db = getFirebaseDatabase();
        unsubscribe = onValue(ref(db, participantPath(gameId, participantId)), (snapshot) => {
          setParticipant(snapshot.exists() ? (snapshot.val() as Participant) : null);
        });
      })
      .catch(() => {
        // A read denial or auth hiccup simply leaves the last known status.
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [configured, gameId, participantId]);

  return participant;
}
