"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ensureAnonymousIdToken, isFirebaseClientConfigured } from "@/lib/firebase/client";
import type { Participant } from "@/lib/game/types";
import { loadParticipantSession, saveParticipantSession } from "@/lib/participant/storage";
import { usePublicGame } from "./use-public-game";
import { TimerBadge } from "./timer-badge";

type JoinResponse = {
  participant: Participant;
  participantId: string;
};

type AnswerResponse = {
  answer: { isCorrect: boolean };
  participant: Participant;
  survivorCount: number;
};

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
  const [gameId, setGameId] = useState("festival-2026");
  const [code, setCode] = useState("GOLDEN");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [answerValue, setAnswerValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { state, questions, loading, error } = usePublicGame(gameId);

  useEffect(() => {
    const session = loadParticipantSession();

    if (session) {
      window.queueMicrotask(() => {
        setGameId(session.gameId);
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

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const idToken = await ensureAnonymousIdToken();
      const result = await postJson<JoinResponse>("/api/participant/join", {
        gameId,
        code,
        studentId,
        name,
        nickname,
        idToken,
      });

      setParticipant(result.participant);
      setParticipantId(result.participantId);
      saveParticipantSession({ gameId, participantId: result.participantId, participant: result.participant });
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
      const result = await postJson<AnswerResponse>("/api/participant/answer", {
        gameId,
        questionId: currentQuestion.id,
        participantId,
        value,
        idToken,
      });

      setParticipant(result.participant);
      saveParticipantSession({ gameId, participantId, participant: result.participant });
      setAnswerValue("");
      setMessage(result.answer.isCorrect ? "정답입니다" : "오답입니다");
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

  return (
    <main className="page participant-page">
      <section className="hero-panel">
        <p className="eyebrow">학생 입장</p>
        <h1>참가 코드로 입장하고 제한 시간 안에 답을 제출하세요.</h1>
        <p className="lede">식별은 학번과 이름으로, 화면 분위기는 별명으로 관리합니다.</p>
      </section>

      <section className="grid two-cols">
        <form className="panel form-panel" onSubmit={handleJoin}>
          <label>게임 ID<input value={gameId} onChange={(event) => setGameId(event.target.value)} /></label>
          <label>참가 코드<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /></label>
          <label>학번<input value={studentId} onChange={(event) => setStudentId(event.target.value)} /></label>
          <label>이름<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>별명<input value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
          <button disabled={busy} type="submit">{participant ? "정보 갱신" : "입장"}</button>
          {participant ? <p className="status-line">{participant.nickname} / {participant.status}</p> : null}
        </form>

        <section className="panel question-preview" aria-label="Current question">
          <div className="question-meta">
            <span>{state?.phase ?? "대기"}</span>
            <TimerBadge startedAt={state?.startedAt ?? null} timeLimitSeconds={state?.timeLimitSeconds ?? 0} />
          </div>
          {loading ? <h2>게임 상태를 불러오는 중입니다.</h2> : null}
          {error ? <p className="status-line danger-text">{error}</p> : null}
          {!currentQuestion ? <h2>현재 표시할 문제가 없습니다.</h2> : null}
          {currentQuestion ? (
            <>
              <h2>{currentQuestion.text}</h2>
              {currentQuestion.choices?.length ? (
                <div className="choices">
                  {currentQuestion.choices.map((choice) => (
                    <button disabled={busy || !participant} key={choice.id} type="button" onClick={() => submitAnswer(choice.id)}>
                      {choice.id}. {choice.label}
                    </button>
                  ))}
                </div>
              ) : (
                <form className="short-answer" onSubmit={(event) => { event.preventDefault(); submitAnswer(answerValue); }}>
                  <input value={answerValue} onChange={(event) => setAnswerValue(event.target.value)} placeholder="정답 입력" />
                  <button disabled={busy || !participant} type="submit">제출</button>
                </form>
              )}
            </>
          ) : null}
        </section>
      </section>

      {message ? <aside className="notice">{message}</aside> : null}
    </main>
  );
}
