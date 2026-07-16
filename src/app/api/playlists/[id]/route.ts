import { NextRequest, NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";
const ADMIN_KEY = process.env.ADMIN_KEY ?? "ts-admin-2026";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== ADMIN_KEY) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const res = await fetch(`${VM}/playlists/${id}`, {
    method: "DELETE",
    headers: { "X-Admin-Key": ADMIN_KEY },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
