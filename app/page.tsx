import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { seedQuestions } from "@/data/questions";

export default function ParticipantPage() {
  const configured = isFirebaseClientConfigured();
  const firstQuestion = seedQuestions[0];

  return (
    <main className="page participant-page">
      <section className="hero-panel">
        <p className="eyebrow">학생 입장</p>
        <h1>참가 코드로 입장하고 바로 골든벨에 참여하세요.</h1>
        <p className="lede">학번과 이름은 식별용, 별명은 화면 표시용으로 사용합니다.</p>
      </section>

      <section className="grid two-cols">
        <form className="panel form-panel">
          <label>
            참가 코드
            <input placeholder="예: GOLDEN" name="code" />
          </label>
          <label>
            학번
            <input placeholder="예: 10101" name="studentId" />
          </label>
          <label>
            이름
            <input placeholder="예: 홍길동" name="name" />
          </label>
          <label>
            별명
            <input placeholder="예: 번개장인" name="nickname" />
          </label>
          <button type="button">입장 준비</button>
        </form>

        <section className="panel question-preview" aria-label="Question preview">
          <div className="question-meta">
            <span>예시 문제</span>
            <strong>{firstQuestion.timeLimitSeconds}초</strong>
          </div>
          <h2>{firstQuestion.text}</h2>
          <div className="choices">
            {firstQuestion.choices?.map((choice) => (
              <button key={choice.id} type="button">
                {choice.id}. {choice.label}
              </button>
            ))}
          </div>
        </section>
      </section>

      {!configured ? (
        <aside className="notice">Firebase 환경 변수가 아직 없어 실시간 연결은 비활성 상태입니다.</aside>
      ) : null}
    </main>
  );
}
