import { NextResponse } from "next/server";
import { isAuthorizedAdminRequest, validateAdminSecret } from "@/lib/admin/security";

// Lightweight gate for the operator login screen: confirms the entered
// secret is valid without performing any game mutation.
export async function POST(request: Request) {
  const secretValidation = validateAdminSecret(process.env.ADMIN_SECRET);

  if (!secretValidation.ok) {
    return NextResponse.json({ error: "Admin secret is not safely configured" }, { status: 500 });
  }

  if (!isAuthorizedAdminRequest(request.headers.get("authorization"), process.env.ADMIN_SECRET)) {
    return NextResponse.json({ error: "인증 코드가 올바르지 않습니다." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
