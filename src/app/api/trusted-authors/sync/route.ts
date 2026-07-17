import { NextResponse } from "next/server";

const VM = "http://138.2.134.17:62000";
const KEY = "ts-admin-2026";

// Called by Vercel Cron every 15 min (and manually from admin)
export async function GET(req: Request) {
  if (
    req.headers.get("authorization") !== `Bearer ${KEY}` &&
    req.headers.get("x-admin-key") !== KEY
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const [authorsRes, queueRes] = await Promise.all([
      fetch(`${VM}/trusted-authors`, { cache: "no-store" }),
      fetch(`${VM}/queue`, { cache: "no-store" }),
    ]);
    const authors: Array<{ handle: string; lastChecked: string | null; tracksAdded: number }> = await authorsRes.json();
    const queue: Array<{ id: string }> = await queueRes.json();

    if (!authors.length) return NextResponse.json({ added: 0, authors: 0 });

    const queueIds = new Set(queue.map((t) => t.id));
    const added: string[] = [];

    for (const author of authors) {
      try {
        const res = await fetch(
          `${VM}/suno-user/${encodeURIComponent(author.handle)}?page=1`,
          { cache: "no-store" }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const tracks: Array<{ id: string; [k: string]: unknown }> = data.results ?? [];
        const newTracks = tracks.filter((t) => !queueIds.has(t.id));
        if (newTracks.length) {
          await fetch(`${VM}/queue`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-Admin-Key": KEY },
            body: JSON.stringify([...queue, ...newTracks.filter((t) => !queueIds.has(t.id))]),
          });
          newTracks.forEach((t) => queueIds.add(t.id));
          added.push(...newTracks.map((t) => t.id as string));
        }
        // update lastChecked on VM
        await fetch(`${VM}/trusted-authors/${encodeURIComponent(author.handle)}/checked`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Admin-Key": KEY },
          body: JSON.stringify({ tracksAdded: newTracks.length }),
        });
      } catch {
        // skip failed author
      }
    }

    return NextResponse.json({ added: added.length, tracks: added });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
