import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  if (!supabase) return NextResponse.json({});
  const { data } = await supabase.from("likes").select("track_id, count");
  const result: Record<string, number> = {};
  for (const row of data ?? []) result[row.track_id] = row.count;
  return NextResponse.json(result);
}
