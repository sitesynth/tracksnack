import { NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";
const KEY = "ts-admin-2026";
const CONFIG_NAME = "__config__";

export async function GET() {
  try {
    const res = await fetch(`${VM}/snapshots/${encodeURIComponent(CONFIG_NAME)}`, {
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({});
    const data = await res.json();
    // Strip internal name field before returning
    const { name: _n, ...config } = data;
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(req: Request) {
  if (req.headers.get("x-admin-key") !== KEY)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    const payload = { name: CONFIG_NAME, ...body };
    const res = await fetch(`${VM}/snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": KEY },
      body: JSON.stringify(payload),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
