import { NextResponse } from "next/server";
import { findTrack } from "@/lib/findTrack";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await findTrack(id);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(found);
}
