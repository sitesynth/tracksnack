import { NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";
const KEY = "ts-admin-2026";

export async function GET() {
  try {
    const res = await fetch(`${VM}/trusted-authors`, { cache: "no-store" });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  if (req.headers.get("x-admin-key") !== KEY) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { handle } = await req.json();
  try {
    const res = await fetch(`${VM}/trusted-authors`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": KEY },
      body: JSON.stringify({ handle }),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  if (req.headers.get("x-admin-key") !== KEY) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle") || "";
  try {
    const res = await fetch(`${VM}/trusted-authors/${encodeURIComponent(handle)}`, {
      method: "DELETE",
      headers: { "X-Admin-Key": KEY },
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
