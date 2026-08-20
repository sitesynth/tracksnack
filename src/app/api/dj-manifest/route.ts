import { NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";

export async function GET() {
  try {
    const res = await fetch(`${VM}/dj-manifest`, { next: { revalidate: 30 } });
    if (!res.ok) return NextResponse.json({ intros: [], jingles: [] });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ intros: [], jingles: [] });
  }
}
