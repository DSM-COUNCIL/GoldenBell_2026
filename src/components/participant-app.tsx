"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ensureAnonymousIdToken, isFirebaseClientConfigured } from "@/lib/firebase/client";
import type { Participant } from "@/lib/game/types";
import { loadParticipantSession, saveParticipantSession } from "@/lib/participant/storage";
import { phaseLabel } from "@/lib/game/labels";
import { usePublicGame } from "./use-public-game";
import { useParticipantRecord } from "./use-participant-record";
import { TimerBadge } from "./timer-badge";

type JoinResponse = {
  participant: Participant;
  participantId: string;
};

const GAME_ID = "festival-2026";

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload;
}

export function ParticipantApp() {
  const configured = isFirebaseClientConfigured();
  const [code, setCode] = useState("GOLDEN");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [answerValue, setAnswerValue] = useState("");
  const [submittedValue, setSubmittedValue] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { state, questions, loading, error } = usePublicGame(GAME_ID);
  const liveParticipant = useParticipantRecord(GAME_ID, participantId);
  const activeParticipant = liveParticipant ?? participant;
  const status = activeParticipant?.status ?? null;

  useEffect(() => {
    const session = loadParticipantSession();

    if (session) {
      window.queueMicrotask(() => {
        setParticipantId(session.participantId);
        setParticipant(session.participant);
      });
    }
  }, []);

  const currentQuestion = useMemo(() => {
    if (!state?.currentQuestionId) {
      return null;
    }

    return questions[state.currentQuestionId] ?? null;
  }, [questions, state?.currentQuestionId]);

  // Reset the per-question submission marker when the question changes.
  // Adjusting state during render (not in an effect) is the recommended pattern.
  const currentQuestionId = state?.currentQuestionId ?? null;
  const [trackedQuestionId, setTrackedQuestionId] = useState<string | null>(null);

  if (currentQuestionId !== trackedQuestionId) {
    setTrackedQuestionId(currentQuestionId);
    setSubmittedValue(null);
    setAnswerValue("");
  }

  const phase = state?.phase ?? "lobby";
  const finished = state?.status === "finished";
  const isWinner = Boolean(participantId && state?.winnerId && state.winnerId === participantId);
  const eligible = currentQuestion
    ? currentQuestion.isRevival
      ? status === "eliminated"
      : status === "alive"
    : false;
  const accepting = state?.status === "running" && (phase === "answering" || phase === "revival");

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const idToken = await ensureAnonymousIdToken();
      const result = await postJson<JoinResponse>("/api/participant/join", {
        gameId: GAME_ID,
        code,
        studentId,
        name,
        nickname: name,
        idToken,
      });

      setParticipant(result.participant);
      setParticipantId(result.participantId);
      saveParticipantSession({ gameId: GAME_ID, participantId: result.participantId, participant: result.participant });
      setMessage("입장 완료");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "입장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(value: string) {
    if (!participantId || !currentQuestion) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const idToken = await ensureAnonymousIdToken();
      await postJson("/api/participant/answer", {
        gameId: GAME_ID,
        questionId: currentQuestion.id,
        participantId,
        value,
        idToken,
      });

      setSubmittedValue(value);
      setAnswerValue("");
      setMessage("제출 완료 · 정답 공개를 기다려 주세요");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "제출 실패");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <main className="page participant-page">
        <section className="hero-panel">
          <p className="eyebrow">학생 입장</p>
          <h1>Firebase 환경 변수를 넣으면 참가자 화면이 활성화됩니다.</h1>
          <p className="lede">연결 전에는 UI와 API 구조만 확인할 수 있습니다.</p>
        </section>
      </main>
    );
  }

  // Human-readable submitted answer: choice label when possible.
  const submittedLabel = (() => {
    if (submittedValue == null) {
      return null;
    }

    const choice = currentQuestion?.choices?.find((entry) => entry.id === submittedValue);
    return choice ? `${choice.id}. ${choice.label}` : submittedValue;
  })();

  function renderStage() {
    if (finished) {
      return (
        <div className={`result-banner ${isWinner ? "win" : ""}`}>
          {isWinner ? (
            <>
              <h2>🎉 골든벨 우승!</h2>
              <p className="status-line">축하합니다. 최후의 1인입니다.</p>
            </>
          ) : (
            <>
              <h2>게임 종료</h2>
              <p className="status-line">우승자: {state?.winnerNickname ?? "-"}</p>
              <p className="status-line">내 결과: {status === "alive" ? "생존" : "탈락"}</p>
            </>
          )}
        </div>
      );
    }

    if (phase === "reveal") {
      return (
        <div className="result-banner">
          <p className="eyebrow">정답 공개</p>
          <h2>정답: {state?.revealAnswerLabel ?? "-"}</h2>
          {submittedLabel ? <p className="status-line">내가 낸 답: {submittedLabel}</p> : <p className="status-line">미응답</p>}
          <p className={`status-line ${status === "eliminated" ? "danger-text" : ""}`}>
            내 상태: {status === "alive" ? "✅ 생존" : "❌ 탈락"}
          </p>
          {state?.rematch ? <p className="status-line">전원 탈락으로 이 문제는 무효 처리되었습니다. 재대결을 준비하세요.</p> : null}
        </div>
      );
    }

    if (loading) {
      return <h2>게임 상태를 불러오는 중입니다.</h2>;
    }

    if (error) {
      return <p className="status-line danger-text">{error}</p>;
    }

    if (!currentQuestion || !accepting) {
      if (phase === "closed") {
        return <h2>마감되었습니다. 정답 공개를 기다려 주세요.</h2>;
      }

      return <h2>다음 문제를 기다려 주세요.</h2>;
    }

    if (!eligible) {
      return (
        <h2>
          {currentQuestion.isRevival
            ? "생존자는 쉬어가는 패자부활전입니다."
            : "탈락 상태입니다. 패자부활전을 기다려 주세요."}
        </h2>
      );
    }

    return (
      <>
        {currentQuestion.isRevival ? <p className="eyebrow">패자부활전</p> : null}
        <h2>{currentQuestion.text}</h2>
        {currentQuestion.choices?.length ? (
          <div className="choices">
            {currentQuestion.choices.map((choice) => (
              <button
                disabled={busy}
                key={choice.id}
                type="button"
                className={submittedValue === choice.id ? "selected" : ""}
                onClick={() => submitAnswer(choice.id)}
              >
                {choice.id}. {choice.label}
              </button>
            ))}
          </div>
        ) : (
          <form className="short-answer" onSubmit={(event) => { event.preventDefault(); submitAnswer(answerValue); }}>
            <input value={answerValue} onChange={(event) => setAnswerValue(event.target.value)} placeholder="정답 입력" />
            <button disabled={busy || !answerValue.trim()} type="submit">제출</button>
          </form>
        )}
        {submittedValue != null ? (
          <p className="status-line">제출됨: {submittedLabel} · 마감 전까지 다시 눌러 바꿀 수 있어요</p>
        ) : null}
      </>
    );
  }

  return (
    <main className="page participant-page">
      <section className="hero-panel">
        <p className="eyebrow">🔔 GoldenBell 2026</p>
        <h1>골든벨 참가</h1>
      </section>

      <section className="grid two-cols">
        <form className="panel form-panel" onSubmit={handleJoin}>
          <label>참가 코드<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="운영자가 안내한 코드" /></label>
          <label>학번<input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="예: 1101" /></label>
          <label>이름<input value={name} onChange={(event) => setName(event.target.value)} placeholder="실명" /></label>
          <button disabled={busy} type="submit">{participant ? "정보 갱신" : "입장하기"}</button>
          {activeParticipant ? (
            <p className="participant-identity">
              <span className="who">{activeParticipant.nickname}</span>
              <span className={`pill ${status === "alive" ? "pill-alive" : "pill-out"}`}>
                {status === "alive" ? "● 생존" : "● 탈락"}
              </span>
            </p>
          ) : null}
        </form>

        <section className="panel question-preview" aria-label="Current question">
          <div className="question-meta">
            <span>{finished ? "종료" : phaseLabel(phase)}</span>
            <span>생존자 {state?.survivorCount ?? 0}명</span>
            <TimerBadge startedAt={state?.startedAt ?? null} timeLimitSeconds={state?.timeLimitSeconds ?? 0} />
          </div>
          {renderStage()}
        </section>
      </section>

      {message ? <aside className="notice">{message}</aside> : null}
    </main>
  );
}
