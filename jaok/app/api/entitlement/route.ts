import { NextRequest, NextResponse } from "next/server";
import { isUnlocked } from "@/lib/entitlement";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const mockup = request.nextUrl.searchParams.get("mockup");

  if (!token || !mockup) {
    return NextResponse.json({ error: "token and mockup are required" }, { status: 400 });
  }

  const unlocked = await isUnlocked(token, mockup);
  return NextResponse.json({ unlocked });
}
