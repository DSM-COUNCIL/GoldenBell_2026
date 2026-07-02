import { NextResponse } from "next/server";
import { isSafeRealtimeId } from "@/lib/admin/commands";
import { isAuthorizedAdminRequest, validateAdminSecret } from "@/lib/admin/security";
import { getErrorMessage, getErrorStatus, ServiceError } from "@/lib/services/errors";
import { seedGame } from "@/lib/services/game-service";

type SeedBody = {
  gameId?: unknown;
  code?: unknown;
};

function parseSeedBody(body: SeedBody) {
  if (!isSafeRealtimeId(body.gameId)) {
    throw new ServiceError("gameId must be a safe 1-64 character slug");
  }

  if (typeof body.code !== "string" || !/^[A-Za-z0-9_-]{4,16}$/.test(body.code.trim())) {
    throw new ServiceError("code must be a 4-16 character code");
  }

  return { gameId: body.gameId, code: body.code.trim().toUpperCase() };
}

export async function POST(request: Request) {
  try {
    const secretValidation = validateAdminSecret(process.env.ADMIN_SECRET);

    if (!secretValidation.ok) {
      throw new ServiceError("Admin secret is not safely configured", 500);
    }

    if (!isAuthorizedAdminRequest(request.headers.get("authorization"), process.env.ADMIN_SECRET)) {
      throw new ServiceError("Unauthorized", 401);
    }

    const input = parseSeedBody((await request.json()) as SeedBody);
    const result = await seedGame(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatus(error) });
  }
}
