import { seedQuestions } from "@/data/questions";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";

export default function AdminPage() {
  const configured = isFirebaseAdminConfigured();
  const survivorCount = 200;

  return (
    <main className="page admin-page">
      <section className="hero-panel compact">
        <p className="eyebrow">운영자 콘솔</p>
        <h1>자동 진행을 기본으로 두고, 현장 변수는 수동 제어로 처리합니다.</h1>
      </section>

      <section className="dashboard-grid">
        <div className="metric"><span>생존자</span><strong>{survivorCount}</strong></div>
        <div className="metric"><span>문제 수</span><strong>{seedQuestions.length}</strong></div>
        <div className="metric"><span>현재 단계</span><strong>대기</strong></div>
      </section>

      <section className="panel controls-panel">
        <h2>진행 제어</h2>
        <div className="button-row">
          <button type="button">게임 시작</button>
          <button type="button">일시정지</button>
          <button type="button">+5초</button>
          <button type="button">강제 마감</button>
          <button type="button">다음 문제</button>
        </div>
      </section>

      <section className="panel table-panel">
        <h2>문제 큐</h2>
        <ol className="question-list">
          {seedQuestions.map((question) => (
            <li key={question.id}>
              <span>{question.order}. {question.text}</span>
              <strong>{question.isRevival ? "패자부활" : question.type}</strong>
            </li>
          ))}
        </ol>
      </section>

      {!configured ? (
        <aside className="notice">Firebase Admin 환경 변수가 없어 운영자 쓰기 작업은 아직 연결되지 않았습니다.</aside>
      ) : null}
    </main>
  );
}
