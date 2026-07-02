"use client";

import { useMemo, useState } from "react";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { usePublicGame } from "./use-public-game";
import { TimerBadge } from "./timer-badge";

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
  const [gameId, setGameId] = useState("festival-2026");
  const [code, setCode] = useState("GOLDEN");
  const [secret, setSecret] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("easy-001");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { state, questions, loading, error } = usePublicGame(gameId);

  const orderedQuestions = useMemo(
    () => Object.values(questions).sort((a, b) => a.order - b.order),
    [questions],
  );
  const selectedQuestion = questions[selectedQuestionId] ?? orderedQuestions[0];

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
        gameId,
        action,
        questionId: selectedQuestion?.id,
        timeLimitSeconds: selectedQuestion?.timeLimitSeconds,
        ...extra,
      }),
    );
  }

  return (
    <main className="page admin-page">
      <section className="hero-panel compact">
        <p className="eyebrow">운영자 콘솔</p>
        <h1>문제 seed, 자동 진행, 강제 마감, 정답 공개를 제어합니다.</h1>
      </section>

      <section className="panel form-panel admin-setup">
        <label>게임 ID<input value={gameId} onChange={(event) => setGameId(event.target.value)} /></label>
        <label>참가 코드<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /></label>
        <label>ADMIN_SECRET<input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} /></label>
        <button disabled={busy} type="button" onClick={() => run("문제 seed", () => adminPost("/api/admin/seed", secret, { gameId, code }))}>
          문제 seed
        </button>
      </section>

      <section className="dashboard-grid">
        <div className="metric"><span>생존자</span><strong>{state?.survivorCount ?? 0}</strong></div>
        <div className="metric"><span>현재 단계</span><strong>{state?.phase ?? "-"}</strong></div>
        <div className="metric"><span>타이머</span><TimerBadge startedAt={state?.startedAt ?? null} timeLimitSeconds={state?.timeLimitSeconds ?? 0} /></div>
      </section>

      <section className="panel controls-panel">
        <h2>진행 제어</h2>
        <label>문제 선택
          <select value={selectedQuestionId} onChange={(event) => setSelectedQuestionId(event.target.value)}>
            {orderedQuestions.map((question) => (
              <option key={question.id} value={question.id}>{question.order}. {question.text}</option>
            ))}
          </select>
        </label>
        <div className="button-row">
          <button disabled={busy || !selectedQuestion} type="button" onClick={() => control("start", { phase: selectedQuestion?.isRevival ? "revival" : "answering" })}>시작</button>
          <button disabled={busy} type="button" onClick={() => control("pause")}>일시정지</button>
          <button disabled={busy} type="button" onClick={() => control("resume")}>재개</button>
          <button disabled={busy} type="button" onClick={() => control("close")}>강제 마감</button>
          <button disabled={busy} type="button" onClick={() => control("reveal")}>정답 공개</button>
          <button disabled={busy || !selectedQuestion} type="button" onClick={() => control("next", { phase: selectedQuestion?.isRevival ? "revival" : "answering" })}>다음 문제</button>
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
