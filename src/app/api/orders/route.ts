import { NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${VM}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const key = req.headers.get("x-admin-key");
  if (key !== "ts-admin-2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const res = await fetch(`${VM}/orders`, {
      headers: { "X-Admin-Key": "ts-admin-2026" },
      cache: "no-store",
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}

export async function PATCH(req: Request) {
  const key = req.headers.get("x-admin-key");
  if (key !== "ts-admin-2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const res = await fetch(`${VM}/orders`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Key": "ts-admin-2026" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
