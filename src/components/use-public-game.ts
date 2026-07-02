"use client";

import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { ensureAnonymousSession, getFirebaseDatabase, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { publicGameStatePath, publicQuestionsPath } from "@/lib/firebase/paths";
import type { PublicQuestion } from "@/lib/game/public";
import type { GameState } from "@/lib/game/types";

export type PublicGameSnapshot = {
  state: (GameState & { updatedAt?: number }) | null;
  questions: Record<string, PublicQuestion>;
  loading: boolean;
  error: string | null;
};

export function usePublicGame(gameId: string): PublicGameSnapshot {
  const [state, setState] = useState<PublicGameSnapshot["state"]>(null);
  const [questions, setQuestions] = useState<Record<string, PublicQuestion>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isFirebaseClientConfigured();

  useEffect(() => {
    if (!configured || !gameId) {
      return;
    }

    let unsubState: (() => void) | undefined;
    let unsubQuestions: (() => void) | undefined;
    let cancelled = false;

    window.queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });

    ensureAnonymousSession()
      .then(() => {
        if (cancelled) {
          return;
        }

        const db = getFirebaseDatabase();
        unsubState = onValue(ref(db, publicGameStatePath(gameId)), (snapshot) => {
          setState(snapshot.exists() ? (snapshot.val() as PublicGameSnapshot["state"]) : null);
          setLoading(false);
        });
        unsubQuestions = onValue(ref(db, publicQuestionsPath(gameId)), (snapshot) => {
          setQuestions(snapshot.exists() ? (snapshot.val() as Record<string, PublicQuestion>) : {});
        });
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Failed to connect to Firebase");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubState?.();
      unsubQuestions?.();
    };
  }, [configured, gameId]);

  return useMemo(() => ({ state, questions, loading, error }), [state, questions, loading, error]);
}
