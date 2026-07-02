import { seedQuestions } from "@/data/questions";

export default function StagePage() {
  const current = seedQuestions[0];

  return (
    <main className="stage-screen">
      <section className="stage-status">
        <span>문제 {current.order}</span>
        <strong>{current.timeLimitSeconds}</strong>
        <span>생존자 200명</span>
      </section>

      <section className="stage-question">
        <p>{current.isRevival ? "패자부활전" : "골든벨"}</p>
        <h1>{current.text}</h1>
        <div className="stage-choices">
          {current.choices?.map((choice) => (
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
