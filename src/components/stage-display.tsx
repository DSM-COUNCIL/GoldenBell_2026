"use client";

import { useEffect, useMemo, useRef } from "react";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { phaseLabel } from "@/lib/game/labels";
import { TimerBadge } from "./timer-badge";
import { usePublicGame } from "./use-public-game";

const GAME_ID = "festival-2026";

// Deterministic confetti pieces (index-based, so no SSR hydration mismatch).
const CONFETTI_COLORS = ["#f7c948", "#0ea5b5", "#ffffff", "#ff8fab", "#7dd3fc", "#c084fc"];
const CONFETTI = Array.from({ length: 44 }, (_, i) => ({
  left: (i * 2.35) % 100,
  delay: (i % 12) * 0.33,
  duration: 3 + (i % 6) * 0.5,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

// Shrinks the question font until it fits within two lines, so even a long
// question never spills into a wall of text on the big screen.
function StageQuestion({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const MAX = 86;
    const MIN = 46;
    const LINES = 2;

    const fit = () => {
      let size = MAX;
      el.style.fontSize = `${size}px`;

      while (size > MIN) {
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || size * 1.2;
        if (el.scrollHeight <= lineHeight * LINES + 1) {
          break;
        }
        size -= 2;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [text]);

  return (
    <h1 ref={ref} className="stage-q">
      {text}
    </h1>
  );
}

export function StageDisplay() {
  const configured = isFirebaseClientConfigured();
  const { state, questions } = usePublicGame(GAME_ID);
  const current = useMemo(() => {
    if (!state?.currentQuestionId) {
      return null;
    }

    return questions[state.currentQuestionId] ?? null;
  }, [questions, state?.currentQuestionId]);

  if (!configured) {
    return (
      <main className="stage-screen stage-centered">
        <section className="stage-question">
          <p>GoldenBell 2026</p>
          <h1 className="stage-q">Firebase 환경 변수를 넣으면 무대 화면이 활성화됩니다.</h1>
        </section>
      </main>
    );
  }

  const finished = state?.status === "finished";
  const revealing = state?.phase === "reveal";
  // Highlight the correct choice only when the current question is the one
  // being revealed, so answers never leak on the big screen early.
  const revealedForCurrent = revealing && state?.revealQuestionId === current?.id;

  if (finished) {
    return (
      <main className="stage-screen stage-centered stage-win">
        <div className="confetti" aria-hidden="true">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              style={{
                left: `${c.left}%`,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                background: c.color,
              }}
            />
          ))}
        </div>
        <section className="stage-winner">
          <p className="winner-crown" aria-hidden="true">👑</p>
          <p className="winner-title">🔔 골든벨 우승 🔔</p>
          <h1 className="winner-name">{state?.winnerNickname ?? "우승자 없음"}</h1>
          <span>최후의 1인이 탄생했습니다!</span>
        </section>
      </main>
    );
  }

  return (
    <main className="stage-screen">
      <section className="stage-status">
        <span>{current ? `문제 ${current.order}` : "대기"}</span>
        <TimerBadge startedAt={state?.startedAt ?? null} timeLimitSeconds={state?.timeLimitSeconds ?? 0} />
        <span>생존자 {state?.survivorCount ?? 0}명</span>
      </section>

      <section className="stage-question">
        <p>{current?.isRevival ? "패자부활전" : phaseLabel(state?.phase)}</p>
        <StageQuestion text={current?.text ?? "현재 문제가 없습니다."} />
        {current?.choices?.length ? (
          <div className="stage-choices">
            {current.choices.map((choice) => (
              <div
                key={choice.id}
                className={revealedForCurrent && state?.revealAnswer === choice.id ? "correct" : ""}
              >
                <strong>{choice.id}</strong>
                <span>{choice.label}</span>
              </div>
            ))}
          </div>
        ) : current && !revealedForCurrent ? (
          <p className="stage-hint">✏️ 주관식 · 학생들이 직접 답을 입력합니다</p>
        ) : null}
      </section>

      {revealing ? (
        <div className="reveal-modal" role="dialog" aria-label="정답 공개">
          <div className="reveal-card">
            <p className="reveal-eyebrow">정답 공개</p>
            <h2 className="reveal-answer">{state?.revealAnswerLabel ?? "-"}</h2>
            <div className="reveal-survivors">
              생존자 <strong>{state?.survivorCount ?? 0}</strong>명
            </div>
            {state?.rematch ? <p className="reveal-note">전원 탈락 · 재대결을 진행합니다</p> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
