import { NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const res = await fetch(`${VM}/custom/${id}/tracks`, { next: { revalidate: 0 } });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json([]);
  }
}
