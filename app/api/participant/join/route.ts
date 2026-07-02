import { NextResponse } from "next/server";
import { parseJoinInput } from "@/lib/participant/validation";
import { getErrorMessage, getErrorStatus } from "@/lib/services/errors";
import { joinParticipant } from "@/lib/services/game-service";

export async function POST(request: Request) {
  try {
    const input = parseJoinInput(await request.json());
    const result = await joinParticipant(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatus(error) });
  }
}
