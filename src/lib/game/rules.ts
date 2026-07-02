import type { Participant, Question } from "./types";

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s.]+/g, "")
    .replace(/[，,]/g, "")
    .replace(/[()]/g, "");
}

export function getAcceptedAnswers(question: Question): string[] {
  const answers = question.acceptedAnswers?.length
    ? question.acceptedAnswers
    : [question.answer];

  return Array.from(new Set(answers.map(normalizeAnswer)));
}

export function isCorrectAnswer(question: Question, submittedValue: string): boolean {
  return getAcceptedAnswers(question).includes(normalizeAnswer(submittedValue));
}

export function canAnswerQuestion(participant: Participant, question: Question): boolean {
  if (question.isRevival) {
    return participant.status === "eliminated";
  }

  return participant.status === "alive";
}

export function getNextStatus(
  participant: Participant,
  question: Question,
  isCorrect: boolean,
): Participant["status"] {
  if (question.isRevival) {
    return isCorrect ? "alive" : participant.status;
  }

  return isCorrect ? participant.status : "eliminated";
}
