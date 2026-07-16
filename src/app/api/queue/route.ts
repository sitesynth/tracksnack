import { NextRequest, NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";
const ADMIN_KEY = process.env.ADMIN_KEY ?? "ts-admin-2026";

export async function GET() {
  try {
    const res = await fetch(`${VM}/queue`, { next: { revalidate: 0 } });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== ADMIN_KEY) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const res = await fetch(`${VM}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function PUT(req: NextRequest) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== ADMIN_KEY) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const res = await fetch(`${VM}/queue`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
