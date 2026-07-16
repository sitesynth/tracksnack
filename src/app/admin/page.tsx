"use client";

import { useEffect, useState, useCallback } from "react";

const ADMIN_KEY = "ts-admin-2026";

type Playlist = { id: string; name: string; song_count: number; cover_url: string; display_name?: string; description?: string };
type Track = {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  image_url: string;
  duration: number;
  source_playlist_id?: string;
};

function fmt(s: number) {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

const BG = "#0F0D0B";
const CARD = "#1A1714";
const BORDER = "rgba(255,255,255,0.1)";
const YELLOW = "#FFD731";
const PINK = "#F25CA2";
const GREEN = "#55DB9C";
const TEXT = "#FFFDF6";

const adminHeaders = {
  "Content-Type": "application/json",
  "X-Admin-Key": ADMIN_KEY,
};

function PlaylistSourceCard({
  pl, onRemove, onSave, colors,
}: {
  pl: Playlist;
  onRemove: (id: string) => void;
  onSave: (id: string, display_name: string, description: string) => Promise<void>;
  colors: { BORDER: string; CARD: string; PINK: string; TEXT: string; YELLOW: string; GREEN: string };
}) {
  const { BORDER, CARD, PINK, TEXT, YELLOW, GREEN } = colors;
  const [displayName, setDisplayName] = useState(pl.display_name ?? "");
  const [description, setDescription] = useState(pl.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(pl.id, displayName, description);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const dirty = displayName !== (pl.display_name ?? "") || description !== (pl.description ?? "");

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: "0.75rem", background: CARD, overflow: "hidden" }}>
      <div style={{ padding: "0.75rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
        {pl.cover_url
          ? <img src={pl.cover_url} alt="" style={{ width: 46, height: 46, borderRadius: "0.375rem", objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 46, height: 46, borderRadius: "0.375rem", background: "#2B2A28", flexShrink: 0 }} />
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, margin: "0 0 0.1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.875rem" }}>
            {pl.name}
          </p>
          <p style={{ fontSize: "0.7rem", opacity: 0.4, margin: 0 }}>{pl.song_count} tracks · {pl.id.slice(0, 8)}…</p>
        </div>
        <button
          onClick={() => onRemove(pl.id)}
          aria-label="Remove"
          style={{
            width: 28, height: 28, borderRadius: "50%",
            border: `1px solid ${BORDER}`, background: "transparent",
            color: PINK, cursor: "pointer", fontWeight: 900,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >✕</button>
      </div>
      <div style={{ padding: "0 1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem", borderTop: `1px solid ${BORDER}` }}>
        <p style={{ margin: "0.5rem 0 0.25rem", fontSize: "0.65rem", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Display on site
        </p>
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder={`Title (default: "${pl.name}")`}
          style={{
            padding: "0.4rem 0.6rem", background: "rgba(255,255,255,0.05)",
            border: `1px solid ${BORDER}`, borderRadius: "0.375rem",
            color: TEXT, fontSize: "0.85rem", width: "100%",
          }}
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          style={{
            padding: "0.4rem 0.6rem", background: "rgba(255,255,255,0.05)",
            border: `1px solid ${BORDER}`, borderRadius: "0.375rem",
            color: TEXT, fontSize: "0.8rem", width: "100%",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.1rem" }}>
          <button
            onClick={save}
            disabled={!dirty || saving}
            style={{
              padding: "0.3rem 0.8rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 700,
              border: `1px solid ${dirty ? YELLOW : BORDER}`,
              background: saved ? GREEN : dirty ? YELLOW : "transparent",
              color: dirty || saved ? "#0F0D0B" : TEXT,
              cursor: dirty ? "pointer" : "default", opacity: dirty || saved ? 1 : 0.4,
              transition: "all 0.15s",
            }}
          >
            {saved ? "Saved ✓" : saving ? "…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState<"mix" | "sources">("mix");

  const [sources, setSources] = useState<Playlist[]>([]);
  const [newSourceId, setNewSourceId] = useState("");
  const [sourceMsg, setSourceMsg] = useState("");

  const [selectedSource, setSelectedSource] = useState("");
  const [sourceTracks, setSourceTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [trackError, setTrackError] = useState("");

  const [queue, setQueue] = useState<Track[]>([]);
  const [flashMsg, setFlashMsg] = useState("");

  const flash = (msg: string) => {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(""), 2500);
  };

  const loadSources = useCallback(async () => {
    const res = await fetch("/api/playlists");
    setSources(await res.json());
  }, []);

  const loadQueue = useCallback(async () => {
    const res = await fetch("/api/queue");
    setQueue(await res.json());
  }, []);

  useEffect(() => {
    loadSources();
    loadQueue();
  }, [loadSources, loadQueue]);

  async function loadSourceTracks(playlistId: string) {
    if (!playlistId) { setSourceTracks([]); return; }
    setLoadingTracks(true);
    setSourceTracks([]);
    setTrackError("");
    const res = await fetch(`/api/playlist-tracks/${playlistId}`, {
      headers: { "X-Admin-Key": ADMIN_KEY },
    });
    const data = await res.json();
    if (!res.ok) { setTrackError(data.error ?? "Failed to load"); setLoadingTracks(false); return; }
    setSourceTracks(Array.isArray(data) ? data : []);
    setLoadingTracks(false);
  }

  async function addToMix(track: Track) {
    const res = await fetch("/api/queue", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(track),
    });
    const data = await res.json();
    if (res.ok) { flash(`+ ${track.title}`); await loadQueue(); }
    else flash(data.error === "already in queue" ? "Already in mix" : (data.error ?? "error"));
  }

  async function removeFromMix(trackId: string) {
    await fetch(`/api/queue/${trackId}`, { method: "DELETE", headers: adminHeaders });
    await loadQueue();
  }

  async function clearQueue() {
    await fetch("/api/queue", { method: "PUT", headers: adminHeaders, body: JSON.stringify([]) });
    await loadQueue();
  }

  async function addSource() {
    const m = newSourceId.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    const id = m ? m[1] : newSourceId.trim();
    if (!id) return;
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (res.ok) { setSourceMsg(`Added: ${data.name}`); setNewSourceId(""); await loadSources(); }
    else setSourceMsg(data.error ?? "error");
    setTimeout(() => setSourceMsg(""), 3000);
  }

  async function removeSource(id: string) {
    await fetch(`/api/playlists/${id}`, { method: "DELETE", headers: adminHeaders });
    if (selectedSource === id) { setSelectedSource(""); setSourceTracks([]); }
    await loadSources();
  }

  async function updatePlaylistMeta(id: string, display_name: string, description: string) {
    await fetch(`/api/playlists/${id}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ display_name: display_name.trim(), description: description.trim() }),
    });
    await loadSources();
  }

  const inQueue = new Set(queue.map(t => t.id));

  return (
    <div style={{ minHeight: "100vh", height: "100vh", background: BG, color: TEXT, fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        <span style={{ fontFamily: "Impact, serif", fontSize: "1.4rem", letterSpacing: "0.05em" }}>
          🎛 TRACKSNACK DJ
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          {(["mix", "sources"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "0.35rem 1rem", borderRadius: "999px",
                border: `2px solid ${tab === t ? YELLOW : BORDER}`,
                background: tab === t ? YELLOW : "transparent",
                color: tab === t ? BG : TEXT,
                fontWeight: 700, cursor: "pointer", fontSize: "0.8rem",
              }}
            >
              {t === "mix" ? "Main Mix" : "Sources"}
            </button>
          ))}
        </div>
      </div>

      {/* Flash */}
      {flashMsg && (
        <div style={{ background: GREEN, color: BG, padding: "0.4rem 1.5rem", fontWeight: 700, fontSize: "0.82rem", flexShrink: 0 }}>
          {flashMsg}
        </div>
      )}

      {/* MIX TAB */}
      {tab === "mix" && (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>

          {/* Left — source browser */}
          <div style={{ borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, overflow: "hidden" }}>
            <div style={{ padding: "0.875rem 1.25rem", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.7rem", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Source playlist
              </p>
              <select
                value={selectedSource}
                onChange={e => { setSelectedSource(e.target.value); loadSourceTracks(e.target.value); }}
                style={{
                  width: "100%", padding: "0.55rem 0.75rem",
                  background: CARD, color: TEXT, border: `1px solid ${BORDER}`,
                  borderRadius: "0.5rem", fontSize: "0.875rem",
                }}
              >
                <option value="">Pick a source…</option>
                {sources.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.song_count})</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {!selectedSource && (
                <p style={{ padding: "1.5rem", opacity: 0.25, fontSize: "0.875rem" }}>
                  Select a source playlist above to browse its tracks
                </p>
              )}
              {loadingTracks && <p style={{ padding: "1.5rem", opacity: 0.4 }}>Loading tracks…</p>}
              {trackError && <p style={{ padding: "1.5rem", color: PINK, fontSize: "0.85rem" }}>{trackError}</p>}
              {!loadingTracks && selectedSource && !trackError && sourceTracks.length === 0 && (
                <p style={{ padding: "1.5rem", opacity: 0.4, fontSize: "0.875rem" }}>No tracks found</p>
              )}
              {sourceTracks.map(track => {
                const added = inQueue.has(track.id);
                return (
                  <div
                    key={track.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.625rem",
                      padding: "0.625rem 1.25rem", borderBottom: `1px solid ${BORDER}`,
                      opacity: added ? 0.35 : 1, transition: "opacity 0.15s",
                    }}
                  >
                    {track.image_url
                      ? <img src={track.image_url} alt="" style={{ width: 38, height: 38, borderRadius: "0.3rem", objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 38, height: 38, borderRadius: "0.3rem", background: CARD, flexShrink: 0 }} />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {track.title}
                      </p>
                      {track.artist && (
                        <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.45 }}>{track.artist}</p>
                      )}
                    </div>
                    {track.duration ? (
                      <span style={{ fontSize: "0.7rem", opacity: 0.35, flexShrink: 0 }}>{fmt(track.duration)}</span>
                    ) : null}
                    <button
                      onClick={() => !added && addToMix(track)}
                      disabled={added}
                      aria-label="Add to mix"
                      style={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${added ? BORDER : GREEN}`,
                        background: added ? "transparent" : GREEN,
                        color: added ? BORDER : BG,
                        cursor: added ? "default" : "pointer",
                        fontWeight: 900, fontSize: "1rem",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {added ? "✓" : "+"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — queue */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
            <div style={{ padding: "0.875rem 1.25rem", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: "0.9rem" }}>Tonight&apos;s Mix</p>
                <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.4 }}>{queue.length} tracks</p>
              </div>
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  style={{
                    marginLeft: "auto", padding: "0.3rem 0.7rem",
                    border: `1px solid ${BORDER}`, borderRadius: "0.375rem",
                    background: "transparent", color: TEXT,
                    cursor: "pointer", fontSize: "0.75rem", opacity: 0.5,
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {queue.length === 0 && (
                <p style={{ padding: "1.5rem", opacity: 0.25, fontSize: "0.875rem" }}>
                  The mix is empty — add tracks from the source browser
                </p>
              )}
              {queue.map((track, i) => (
                <div
                  key={track.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    padding: "0.625rem 1.25rem", borderBottom: `1px solid ${BORDER}`,
                  }}
                >
                  <span style={{ fontSize: "0.7rem", opacity: 0.25, width: 18, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                  {track.image_url
                    ? <img src={track.image_url} alt="" style={{ width: 38, height: 38, borderRadius: "0.3rem", objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 38, height: 38, borderRadius: "0.3rem", background: CARD, flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {track.title}
                    </p>
                    {track.artist && (
                      <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.45 }}>{track.artist}</p>
                    )}
                  </div>
                  {track.duration ? (
                    <span style={{ fontSize: "0.7rem", opacity: 0.35, flexShrink: 0 }}>{fmt(track.duration)}</span>
                  ) : null}
                  <button
                    onClick={() => removeFromMix(track.id)}
                    aria-label="Remove"
                    style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      border: `1px solid ${BORDER}`, background: "transparent", color: PINK,
                      cursor: "pointer", fontWeight: 900, fontSize: "0.875rem",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SOURCES TAB */}
      {tab === "sources" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          <p style={{ margin: "0 0 1.25rem", opacity: 0.45, fontSize: "0.82rem", maxWidth: 480 }}>
            Connect Suno playlists. They appear in the source browser for building your mix, and also in "Tonight&apos;s Menu" on the main site.
          </p>

          <div style={{ display: "flex", gap: "0.625rem", marginBottom: "1.5rem", flexWrap: "wrap", maxWidth: 560 }}>
            <input
              value={newSourceId}
              onChange={e => setNewSourceId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addSource()}
              placeholder="Suno playlist URL or UUID"
              style={{
                flex: 1, minWidth: 240, padding: "0.625rem 0.875rem",
                border: `2px solid ${TEXT}`, borderRadius: "0.625rem",
                background: "transparent", color: TEXT, fontSize: "0.9rem",
              }}
            />
            <button
              onClick={addSource}
              style={{
                padding: "0.625rem 1.25rem", border: `2px solid ${YELLOW}`,
                borderRadius: "0.625rem", background: YELLOW, color: BG,
                fontWeight: 800, cursor: "pointer", fontSize: "0.9rem",
              }}
            >
              Add source
            </button>
          </div>

          {sourceMsg && (
            <p style={{ marginBottom: "1rem", color: GREEN, fontWeight: 700, fontSize: "0.85rem" }}>{sourceMsg}</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", maxWidth: 560 }}>
            {sources.map(pl => (
              <PlaylistSourceCard
                key={pl.id}
                pl={pl}
                onRemove={removeSource}
                onSave={updatePlaylistMeta}
                colors={{ BORDER, CARD, PINK, TEXT, YELLOW, GREEN }}
              />
            ))}
            {sources.length === 0 && <p style={{ opacity: 0.35, fontSize: "0.875rem" }}>No sources yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
