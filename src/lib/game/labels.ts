import type { GamePhase } from "./types";

// Human-friendly Korean labels for the game phase, shown to students,
// the stage, and the operator instead of the raw enum values.
export function phaseLabel(phase: GamePhase | string | null | undefined): string {
  switch (phase) {
    case "lobby":
      return "대기 중";
    case "answering":
      return "진행 중";
    case "closed":
      return "마감";
    case "reveal":
      return "정답 공개";
    case "revival":
      return "패자부활전";
    default:
      return "대기";
  }
}
