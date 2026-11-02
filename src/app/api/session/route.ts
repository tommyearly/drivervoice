import { NextResponse } from "next/server";
import { getSessionActor } from "@/lib/auth/session";

export async function GET() {
  const actor = await getSessionActor();
  return NextResponse.json(
    { authenticated: Boolean(actor && actor.status === "active") },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
