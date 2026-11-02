import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data/repository";

export async function GET() {
  const store = getRepository();
  return NextResponse.json(
    { mode: store.mode, submissionsOpen: await store.collectionState(), uploadsOpen: store.uploadsOpen },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
