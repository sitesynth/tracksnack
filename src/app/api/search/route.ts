import { NextResponse } from "next/server";
import { norm, searchIndex } from "@/lib/searchIndex";

export async function GET(req: Request) {
  const q = norm(new URL(req.url).searchParams.get("q") ?? "");
  if (q.length < 2) return NextResponse.json([]);
  const words = q.split(" ");
  const rows = await searchIndex();
  const hits = rows
    .filter(r => words.every(w => r.hay.includes(w)))
    // title matches first, then the rest by how early the query appears
    .sort((a, b) => a.hay.indexOf(words[0]) - b.hay.indexOf(words[0]))
    .slice(0, 30)
    .map(({ hay, ...r }) => r);
  return NextResponse.json(hits);
}
