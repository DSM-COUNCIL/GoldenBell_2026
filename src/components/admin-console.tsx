"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { phaseLabel } from "@/lib/game/labels";
import { usePublicGame } from "./use-public-game";
import { TimerBadge } from "./timer-badge";

const GAME_ID = "festival-2026";

type RevealSummary = {
  correctLabel: string;
  survivorCount: number;
  eliminatedCount: number;
  revivedCount: number;
  outcome: "continue" | "winner" | "rematch";
  winnerNickname: string | null;
};

async function adminPost<T>(url: string, secret: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Admin request failed");
  }

  return payload;
}

export function AdminConsole() {
  const configured = isFirebaseClientConfigured();
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState("GOLDEN");
  const [secret, setSecret] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("easy-01");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { state, questions, loading, error } = usePublicGame(GAME_ID);

  const orderedQuestions = useMemo(
    () => Object.values(questions).sort((a, b) => a.order - b.order),
    [questions],
  );
  const selectedQuestion = questions[selectedQuestionId] ?? orderedQuestions[0];

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      await adminPost("/api/admin/verify", secret, {});
      setAuthed(true);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "인증에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function run(label: string, task: () => Promise<unknown>) {
    setBusy(true);
    setMessage(null);

    try {
      await task();
      setMessage(`${label} 완료`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : `${label} 실패`);
    } finally {
      setBusy(false);
    }
  }

  function control(action: string, extra: Record<string, unknown> = {}) {
    return run(action, () =>
      adminPost("/api/admin/game", secret, {
        gameId: GAME_ID,
        action,
        questionId: selectedQuestion?.id,
        timeLimitSeconds: selectedQuestion?.timeLimitSeconds,
        ...extra,
      }),
    );
  }

  async function reveal() {
    setBusy(true);
    setMessage(null);

    try {
      const result = await adminPost<{ reveal: RevealSummary }>("/api/admin/game", secret, {
        gameId: GAME_ID,
        action: "reveal",
      });
      const summary = result.reveal;
      const parts = [`정답: ${summary.correctLabel}`, `생존 ${summary.survivorCount}명`];

      if (summary.eliminatedCount) parts.push(`탈락 ${summary.eliminatedCount}명`);
      if (summary.revivedCount) parts.push(`부활 ${summary.revivedCount}명`);
      if (summary.outcome === "winner") parts.push(`🎉 우승: ${summary.winnerNickname ?? "-"}`);
      if (summary.outcome === "rematch") parts.push("전원 탈락 · 재대결 진행");

      setMessage(parts.join(" · "));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "정답 공개 실패");
    } finally {
      setBusy(false);
    }
  }

  // Auto-reveal the answer when the timer runs out. Requires this operator
  // console to stay open; the manual "정답 공개" button still works for an
  // early reveal.
  const revealRef = useRef(reveal);
  useEffect(() => {
    revealRef.current = reveal;
  });
  const autoRevealedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authed || state?.status !== "running") {
      return;
    }
    if (state.phase !== "answering" && state.phase !== "revival") {
      return;
    }
    if (!state.startedAt || !state.timeLimitSeconds || !state.currentQuestionId) {
      return;
    }

    const key = `${state.currentQuestionId}:${state.startedAt}`;
    if (autoRevealedKeyRef.current === key) {
      return;
    }

    const expiry = state.startedAt + state.timeLimitSeconds * 1000;
    const delay = expiry - Date.now();

    const fire = () => {
      autoRevealedKeyRef.current = key;
      void revealRef.current();
    };

    if (delay <= 0) {
      fire();
      return;
    }

    const timeoutId = window.setTimeout(fire, delay);
    return () => window.clearTimeout(timeoutId);
  }, [authed, state?.status, state?.phase, state?.startedAt, state?.timeLimitSeconds, state?.currentQuestionId]);

  // Auth gate: no game control is reachable until the operator code is verified.
  if (!authed) {
    return (
      <main className="page admin-page auth-page">
        <section className="hero-panel compact">
          <p className="eyebrow">운영자 인증</p>
          <h1>운영자 콘솔</h1>
        </section>
        <form className="panel form-panel auth-card" onSubmit={authenticate}>
          <label>운영자 인증 코드
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="관리자 인증 코드"
              autoFocus
            />
          </label>
          <button disabled={busy || !secret} type="submit">인증하고 입장</button>
          <p className="field-hint">인증 코드가 맞아야 게임 제어 화면으로 들어갈 수 있습니다.</p>
          {message ? <aside className="notice">{message}</aside> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="page admin-page">
      <section className="hero-panel compact">
        <p className="eyebrow">운영자 콘솔 · ✓ 인증됨</p>
        <h1>게임 제어</h1>
      </section>

      <section className="panel form-panel admin-setup">
        <label>참가 코드<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /></label>
        <button disabled={busy} type="button" onClick={() => run("문제 seed", () => adminPost("/api/admin/seed", secret, { gameId: GAME_ID, code }))}>
          문제 seed
        </button>
      </section>

      <section className="dashboard-grid">
        <div className="metric"><span>생존자</span><strong>{state?.survivorCount ?? 0}</strong></div>
        <div className="metric"><span>현재 단계</span><strong>{state?.status === "finished" ? "종료" : phaseLabel(state?.phase)}</strong></div>
        <div className="metric"><span>타이머</span><TimerBadge startedAt={state?.startedAt ?? null} timeLimitSeconds={state?.timeLimitSeconds ?? 0} /></div>
      </section>

      {state?.status === "finished" ? (
        <aside className="notice win-notice">🎉 우승자: {state?.winnerNickname ?? "-"} · 게임이 종료되었습니다.</aside>
      ) : null}

      <section className="panel controls-panel">
        <h2>진행 제어</h2>
        <label>문제 선택
          <select value={selectedQuestionId} onChange={(event) => setSelectedQuestionId(event.target.value)}>
            {orderedQuestions.map((question) => (
              <option key={question.id} value={question.id}>{question.order}. {question.text}</option>
            ))}
          </select>
        </label>

        <div className="control-main">
          <button className="btn-start" disabled={busy || !selectedQuestion} type="button" onClick={() => control("start", { phase: selectedQuestion?.isRevival ? "revival" : "answering" })}>▶ 시작</button>
          <button className="btn-close" disabled={busy} type="button" onClick={() => control("close")}>⏹ 강제 마감</button>
          <button className="btn-reveal" disabled={busy} type="button" onClick={() => reveal()}>💡 정답 공개</button>
          <button className="btn-next" disabled={busy || !selectedQuestion} type="button" onClick={() => control("next", { phase: selectedQuestion?.isRevival ? "revival" : "answering" })}>⏭ 다음 문제</button>
        </div>

        <div className="control-secondary">
          <button className="btn-ghost" disabled={busy} type="button" onClick={() => control("pause")}>⏸ 일시정지</button>
          <button className="btn-ghost" disabled={busy} type="button" onClick={() => control("resume")}>⏵ 재개</button>
        </div>
      </section>

      <section className="panel table-panel">
        <h2>문제 큐</h2>
        {loading ? <p>불러오는 중</p> : null}
        {error ? <p className="danger-text">{error}</p> : null}
        <ol className="question-list">
          {orderedQuestions.map((question) => (
            <li key={question.id}>
              <span>{question.order}. {question.text}</span>
              <strong>{question.isRevival ? "패자부활" : `${question.timeLimitSeconds}초`}</strong>
            </li>
          ))}
        </ol>
      </section>

      {!configured ? <aside className="notice">Firebase 환경 변수가 없어 실시간 구독은 비활성 상태입니다.</aside> : null}
      {message ? <aside className="notice">{message}</aside> : null}
    </main>
  );
}
