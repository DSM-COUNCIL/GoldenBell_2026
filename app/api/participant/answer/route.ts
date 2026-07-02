import { NextResponse } from "next/server";
import { parseAnswerInput } from "@/lib/participant/validation";
import { getErrorMessage, getErrorStatus } from "@/lib/services/errors";
import { submitAnswer } from "@/lib/services/game-service";

export async function POST(request: Request) {
  try {
    const input = parseAnswerInput(await request.json());
    const result = await submitAnswer(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatus(error) });
  }
}
