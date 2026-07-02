import type { Question } from "./types";

export type PublicQuestion = Omit<Question, "answer" | "acceptedAnswers">;

export function toPublicQuestion(question: Question): PublicQuestion {
  const publicQuestion = { ...question } as Partial<Question>;
  delete publicQuestion.answer;
  delete publicQuestion.acceptedAnswers;
  return publicQuestion as PublicQuestion;
}

export function toQuestionRecord(questions: Question[]): Record<string, Question> {
  return Object.fromEntries(questions.map((question) => [question.id, question]));
}

export function toPublicQuestionRecord(questions: Question[]): Record<string, PublicQuestion> {
  return Object.fromEntries(questions.map((question) => [question.id, toPublicQuestion(question)]));
}
