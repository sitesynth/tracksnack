import { NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const res = await fetch(`${VM}/orders`, {
      headers: { "X-Admin-Key": "ts-admin-2026" },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: "unavailable" }, { status: 502 });
    const orders: Array<{ id: string; status: string; audio_url?: string }> = await res.json();
    const order = orders.find(o => o.id === id);
    if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ id: order.id, status: order.status, audio_url: order.audio_url });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
