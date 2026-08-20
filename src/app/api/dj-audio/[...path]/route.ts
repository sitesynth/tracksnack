import { NextRequest, NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";
const SAFE_NAME = /^[a-zA-Z0-9_.() -]+\.mp3$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segs } = await params;
  if (segs.length !== 2) return NextResponse.json({ error: "bad path" }, { status: 400 });
  const [kind, name] = segs;
  if ((kind !== "dj-cache" && kind !== "jingles") || !SAFE_NAME.test(name)) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }
  try {
    const res = await fetch(`${VM}/${kind}/${encodeURIComponent(name)}`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    // Buffer fully so we can send an accurate Content-Length — without it the
    // <audio> element estimates `duration` from a streamed body, which drifts
    // enough on short clips (DJ intros/jingles) to trigger crossfade lookahead
    // before the clip has actually finished playing.
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
