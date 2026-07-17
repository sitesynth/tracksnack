import { NextRequest, NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";
const ADMIN_KEY = process.env.ADMIN_KEY ?? "ts-admin-2026";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== ADMIN_KEY) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const qs = req.nextUrl.searchParams.toString();
  const res = await fetch(`${VM}/suno-search?${qs}`, {
    headers: { "X-Admin-Key": ADMIN_KEY },
    next: { revalidate: 0 },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
