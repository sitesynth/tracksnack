/* Finds a track by id wherever the site can play it from — Fresh, a playlist,
   or the radio queue — together with the list it belongs to, so a shared link
   opens the song inside the same list a listener would find it in. */
const VM = "http://138.2.134.17:62000";

export type TrackRow = {
  id: string;
  title: string;
  audio_url: string;
  image_url: string;
  duration: number;
  ordered_for?: string;
  description?: string;
};

export type FoundTrack = {
  list: TrackRow[];
  index: number;
  source: { key: string; name: string };
};

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${VM}${path}`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function findTrack(id: string): Promise<FoundTrack | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const fresh = await get<{ tracks?: TrackRow[] }>("/fresh");
  const f = fresh?.tracks?.findIndex(t => t.id === id) ?? -1;
  if (fresh?.tracks && f >= 0) {
    return { list: [fresh.tracks[f]], index: 0, source: { key: `fresh-${id}`, name: "Fresh" } };
  }

  const playlists = (await get<{ id: string; name: string }[]>("/custom")) ?? [];
  for (const pl of playlists) {
    const tracks = await get<TrackRow[]>(`/custom/${pl.id}/tracks`);
    const i = Array.isArray(tracks) ? tracks.findIndex(t => t.id === id) : -1;
    if (tracks && i >= 0) return { list: tracks, index: i, source: { key: pl.id, name: pl.name } };
  }

  const queue = await get<TrackRow[]>("/queue");
  const q = Array.isArray(queue) ? queue.findIndex(t => t.id === id) : -1;
  if (queue && q >= 0) return { list: queue, index: q, source: { key: "radio", name: "Radio" } };

  return null;
}
