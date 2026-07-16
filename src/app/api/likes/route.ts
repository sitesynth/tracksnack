import { NextResponse } from "next/server";

const LIKES_API = "http://138.2.134.17:62000";

export async function GET() {
  try {
    const res = await fetch(`${LIKES_API}/likes`, { next: { revalidate: 0 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({});
  }
}
