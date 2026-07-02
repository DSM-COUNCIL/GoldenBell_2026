"use client";

import { useMemo, useState } from "react";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { TimerBadge } from "./timer-badge";
import { usePublicGame } from "./use-public-game";

export function StageDisplay() {
  const configured = isFirebaseClientConfigured();
  const [gameId, setGameId] = useState("festival-2026");
  const { state, questions } = usePublicGame(gameId);
  const current = useMemo(() => {
    if (!state?.currentQuestionId) {
      return null;
    }

    return questions[state.currentQuestionId] ?? null;
  }, [questions, state?.currentQuestionId]);

  if (!configured) {
    return (
      <main className="stage-screen">
        <section className="stage-question">
          <p>GoldenBell 2026</p>
          <h1>Firebase 환경 변수를 넣으면 무대 화면이 활성화됩니다.</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="stage-screen">
      <label className="stage-game-input">
        Game
        <input value={gameId} onChange={(event) => setGameId(event.target.value)} />
      </label>
      <section className="stage-status">
        <span>{current ? `문제 ${current.order}` : "대기"}</span>
        <TimerBadge startedAt={state?.startedAt ?? null} timeLimitSeconds={state?.timeLimitSeconds ?? 0} />
        <span>생존자 {state?.survivorCount ?? 0}명</span>
      </section>

      <section className="stage-question">
        <p>{current?.isRevival ? "패자부활전" : state?.phase ?? "골든벨"}</p>
        <h1>{current?.text ?? "현재 문제가 없습니다."}</h1>
        <div className="stage-choices">
          {current?.choices?.map((choice) => (
            <div key={choice.id}>
              <strong>{choice.id}</strong>
              <span>{choice.label}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
