import { NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";
const KEY = "ts-admin-2026";

export async function GET() {
  try {
    const res = await fetch(`${VM}/config/stream`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({});
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(req: Request) {
  if (req.headers.get("x-admin-key") !== KEY)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    const res = await fetch(`${VM}/config/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": KEY },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
