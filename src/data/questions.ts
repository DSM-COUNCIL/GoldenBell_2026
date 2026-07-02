import type { Question } from "@/lib/game/types";

export const DEFAULT_MULTIPLE_CHOICE_SECONDS = 7;

export const seedQuestions: Question[] = [
  {
    id: "easy-001",
    order: 1,
    type: "multiple",
    difficulty: "easy",
    text: "며칠 동안 계속 비가 내려서 축축하다는 뜻을 가진 말은?",
    choices: [
      { id: "1", label: "궂은 날씨" },
      { id: "2", label: "굳은 날씨" },
      { id: "3", label: "궃은 날씨" },
      { id: "4", label: "궅은 날씨" },
    ],
    answer: "1",
    timeLimitSeconds: DEFAULT_MULTIPLE_CHOICE_SECONDS,
  },
  {
    id: "easy-002",
    order: 2,
    type: "short",
    difficulty: "easy",
    text: "다음 중 미국의 수도는 어디인가요?",
    answer: "워싱턴 D.C.",
    acceptedAnswers: ["워싱턴 D.C.", "워싱턴 DC", "워싱턴디씨", "Washington DC"],
    timeLimitSeconds: 12,
  },
  {
    id: "medium-001",
    order: 3,
    type: "ox",
    difficulty: "medium",
    text: "코알라는 곰이다.",
    choices: [
      { id: "o", label: "O" },
      { id: "x", label: "X" },
    ],
    answer: "x",
    timeLimitSeconds: DEFAULT_MULTIPLE_CHOICE_SECONDS,
  },
  {
    id: "revival-001",
    order: 4,
    type: "multiple",
    difficulty: "medium",
    text: "패자부활전: 다음 중 실제 존재하는 과일은?",
    choices: [
      { id: "1", label: "용과" },
      { id: "2", label: "불과" },
      { id: "3", label: "물과" },
      { id: "4", label: "흙과" },
    ],
    answer: "1",
    timeLimitSeconds: DEFAULT_MULTIPLE_CHOICE_SECONDS,
    isRevival: true,
  },
  {
    id: "hard-001",
    order: 5,
    type: "short",
    difficulty: "hard",
    text: "세계에서 가장 큰 사막은?",
    answer: "남극 사막",
    acceptedAnswers: ["남극 사막", "남극", "Antarctic Desert"],
    timeLimitSeconds: 15,
  },
];
