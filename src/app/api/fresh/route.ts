import { NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || "";
  try {
    const url = date ? `${VM}/fresh?date=${encodeURIComponent(date)}` : `${VM}/fresh`;
    const res = await fetch(url, { cache: "no-store" });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ dates: [], tracks: [], date: "" }, { status: 200 });
  }
}

export async function PUT(req: Request) {
  const key = req.headers.get("x-admin-key");
  if (key !== "ts-admin-2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const res = await fetch(`${VM}/fresh`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Admin-Key": "ts-admin-2026" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
