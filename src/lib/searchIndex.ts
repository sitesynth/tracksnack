/* Every song the site can play — radio queue, playlists, Fresh — flattened into
   one list for search. Rebuilt at most once a minute. */
import type { TrackRow } from "./findTrack";
import { genresOf, type GenreKey } from "./genres";

const VM = "http://138.2.134.17:62000";

export type SearchRow = TrackRow & { source: { key: string; name: string }; hay: string; genres: GenreKey[] };

let cache: { at: number; rows: SearchRow[] } | null = null;

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${VM}${path}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

export async function searchIndex(): Promise<SearchRow[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.rows;

  const [fresh, playlists, queue, tags] = await Promise.all([
    get<{ tracks?: TrackRow[] }>("/fresh"),
    get<{ id: string; name: string }[]>("/custom"),
    get<TrackRow[]>("/queue"),
    get<Record<string, string>>("/track-meta-all"),
  ]);
  const plTracks = await Promise.all(
    (playlists ?? []).map(async pl => ({ pl, tracks: (await get<TrackRow[]>(`/custom/${pl.id}/tracks`)) ?? [] }))
  );

  const seen = new Set<string>();
  const rows: SearchRow[] = [];
  const add = (t: TrackRow, source: { key: string; name: string }) => {
    if (!t?.id || seen.has(t.id)) return;
    seen.add(t.id);
    rows.push({ ...t, source, hay: norm(`${t.title} ${t.ordered_for ?? ""} ${source.name}`), genres: genresOf(tags?.[t.id]) });
  };
  // Fresh first: a song that is both fresh and in the queue should open as the Fresh card.
  for (const t of fresh?.tracks ?? []) add(t, { key: `fresh-${t.id}`, name: "Fresh" });
  for (const { pl, tracks } of plTracks) for (const t of tracks) add(t, { key: pl.id, name: pl.name });
  for (const t of Array.isArray(queue) ? queue : []) add(t, { key: "radio", name: "Radio" });

  if (rows.length) cache = { at: Date.now(), rows };
  return rows;
}
