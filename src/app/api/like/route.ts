import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (!supabase) return NextResponse.json({ ok: false });
  const { trackId, delta } = await req.json() as { trackId: string; delta: 1 | -1 };

  const { data: row } = await supabase
    .from("likes")
    .select("count")
    .eq("track_id", trackId)
    .maybeSingle();

  const newCount = Math.max(0, (row?.count ?? 0) + delta);
  await supabase.from("likes").upsert({ track_id: trackId, count: newCount });

  return NextResponse.json({ count: newCount });
}
