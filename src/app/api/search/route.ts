import { NextResponse } from "next/server";
import { GENRES } from "@/lib/genres";
import { norm, searchIndex } from "@/lib/searchIndex";

/* GET /api/search?q=text&g=rock,jazz&limit=20
   q: every word must appear in title / name / playlist; g: any of these genres. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = norm(sp.get("q") ?? "");
  const wanted = (sp.get("g") ?? "").split(",").filter(k => GENRES.some(g => g.key === k));
  const limit = Math.min(60, Math.max(1, Number(sp.get("limit")) || 20));
  if (q.length < 2 && !wanted.length && !sp.get("random")) return NextResponse.json({ total: 0, hits: [] });

  const words = q ? q.split(" ") : [];
  const rows = await searchIndex();
  const found = rows
    .filter(r => words.every(w => r.hay.includes(w)))
    .filter(r => !wanted.length || r.genres.some(g => wanted.includes(g)));
  if (words.length) found.sort((a, b) => a.hay.indexOf(words[0]) - b.hay.indexOf(words[0]));
  // ?random=1 — one surprise pick out of whatever the filters leave
  if (sp.get("random")) {
    const pick = found[Math.floor(Math.random() * found.length)];
    if (!pick) return NextResponse.json({ total: 0, hits: [] });
    const { hay, genres, ...row } = pick;
    return NextResponse.json({ total: found.length, hits: [row] });
  }
  const hits = found.slice(0, limit).map(({ hay, genres, ...r }) => r);
  return NextResponse.json({ total: found.length, hits });
}
