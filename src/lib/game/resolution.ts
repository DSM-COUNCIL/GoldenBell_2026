import type { Participant, ParticipantStatus, Question } from "./types";

export type RoundResolutionInput = {
  participants: Participant[];
  question: Question;
  // Ids of participants whose stored submission was correct.
  correctParticipantIds: Set<string>;
};

export type StatusUpdate = { participantId: string; status: ParticipantStatus };

// "continue": game goes on. "winner": exactly one survivor remains.
// "rematch": a normal question eliminated every survivor, so it is voided.
export type RoundResolutionOutcome = "continue" | "winner" | "rematch";

export type RoundResolution = {
  updates: StatusUpdate[];
  survivorCount: number;
  outcome: RoundResolutionOutcome;
  winnerId: string | null;
};

// Decides who survives a question at reveal time.
// - Normal question: an alive player who answered wrong OR did not answer at all
//   is eliminated. Eliminated players sit out and stay eliminated.
// - Revival question: an eliminated player who answered correctly returns to
//   alive. Alive players sit out and are unaffected.
export function resolveRound({
  participants,
  question,
  correctParticipantIds,
}: RoundResolutionInput): RoundResolution {
  const isRevival = Boolean(question.isRevival);
  const aliveBefore = participants.filter((participant) => participant.status === "alive").length;

  const nextStatusById = new Map<string, ParticipantStatus>();

  for (const participant of participants) {
    let next: ParticipantStatus = participant.status;

    if (isRevival) {
      if (participant.status === "eliminated" && correctParticipantIds.has(participant.id)) {
        next = "alive";
      }
    } else if (participant.status === "alive" && !correctParticipantIds.has(participant.id)) {
      next = "eliminated";
    }

    nextStatusById.set(participant.id, next);
  }

  const survivorCount = participants.filter(
    (participant) => nextStatusById.get(participant.id) === "alive",
  ).length;

  // Rematch: a normal question wiped out every survivor. Void it — the prior
  // survivors stay alive and the admin re-runs the round with a new question.
  if (!isRevival && survivorCount === 0 && aliveBefore > 0) {
    return { updates: [], survivorCount: aliveBefore, outcome: "rematch", winnerId: null };
  }

  const updates: StatusUpdate[] = [];

  for (const participant of participants) {
    const next = nextStatusById.get(participant.id) ?? participant.status;

    if (next !== participant.status) {
      updates.push({ participantId: participant.id, status: next });
    }
  }

  if (survivorCount === 1) {
    const winner = participants.find(
      (participant) => nextStatusById.get(participant.id) === "alive",
    );

    return { updates, survivorCount, outcome: "winner", winnerId: winner?.id ?? null };
  }

  return { updates, survivorCount, outcome: "continue", winnerId: null };
}
