"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const ADMIN_KEY = "ts-admin-2026";

type Playlist = { id: string; name: string; song_count: number; cover_url: string };

type CustomPlaylist = {
  id: string;
  name: string;
  description: string;
  accent: string;
  cover_url: string;
  track_count: number;
};

const ACCENT_SWATCHES: { key: string; hex: string }[] = [
  { key: "yellow", hex: "#FFD731" },
  { key: "mint", hex: "#55DB9C" },
  { key: "pink", hex: "#F25CA2" },
  { key: "violet", hex: "#9B6BF2" },
  { key: "mustard", hex: "#E8A33D" },
];
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

/* Left-column source browser shared by the Mix and Playlists tabs. */
function SourceBrowser({
  sources, selected, onSelect, tracks, loading, error, isAdded, onAdd, onAddAll, previewId, onPreview,
}: {
  sources: Playlist[];
  selected: string;
  onSelect: (id: string) => void;
  tracks: Track[];
  loading: boolean;
  error: string;
  isAdded: (id: string) => boolean;
  onAdd: (track: Track) => void;
  onAddAll?: () => void;
  previewId: string;
  onPreview: (track: Track) => void;
}) {
  const notAdded = tracks.filter(t => !isAdded(t.id));
  return (
    <>
      <div style={{ padding: "0.875rem 1.25rem", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <p style={{ margin: "0 0 0.4rem", fontSize: "0.7rem", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Source playlist
        </p>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select
            value={selected}
            onChange={e => onSelect(e.target.value)}
            style={{
              flex: 1, padding: "0.55rem 0.75rem",
              background: CARD, color: TEXT, border: `1px solid ${BORDER}`,
              borderRadius: "0.5rem", fontSize: "0.875rem",
            }}
          >
            <option value="">Pick a source…</option>
            {sources.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.song_count})</option>
            ))}
          </select>
          {onAddAll && notAdded.length > 0 && (
            <button
              onClick={onAddAll}
              title={`Add all ${notAdded.length} tracks`}
              style={{
                padding: "0.5rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.72rem", fontWeight: 800,
                border: `2px solid ${GREEN}`, background: GREEN, color: BG,
                cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
              }}
            >
              + All {notAdded.length}
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {!selected && (
          <p style={{ padding: "1.5rem", opacity: 0.25, fontSize: "0.875rem" }}>
            Select a source playlist above to browse its tracks
          </p>
        )}
        {loading && <p style={{ padding: "1.5rem", opacity: 0.4 }}>Loading tracks…</p>}
        {error && <p style={{ padding: "1.5rem", color: PINK, fontSize: "0.85rem" }}>{error}</p>}
        {!loading && selected && !error && tracks.length === 0 && (
          <p style={{ padding: "1.5rem", opacity: 0.4, fontSize: "0.875rem" }}>No tracks found</p>
        )}
        {tracks.map(track => {
          const added = isAdded(track.id);
          const isPlaying = previewId === track.id;
          return (
            <div
              key={track.id}
              style={{
                display: "flex", alignItems: "center", gap: "0.625rem",
                padding: "0.625rem 1.25rem", borderBottom: `1px solid ${BORDER}`,
                opacity: added ? 0.35 : 1, transition: "opacity 0.15s",
                background: isPlaying ? "rgba(85,219,156,0.08)" : "transparent",
              }}
            >
              <button
                onClick={() => onPreview(track)}
                style={{ width: 38, height: 38, borderRadius: "0.3rem", flexShrink: 0, border: "none", padding: 0, cursor: "pointer", position: "relative", background: CARD, overflow: "hidden" }}
                aria-label={isPlaying ? "Pause" : "Play preview"}
              >
                {track.image_url && <img src={track.image_url} alt="" style={{ width: 38, height: 38, objectFit: "cover", display: "block" }} />}
                <span style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  background: isPlaying ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.2)",
                  color: "#fff", fontSize: "0.75rem",
                }}>{isPlaying ? "❚❚" : "▶"}</span>
              </button>
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
                onClick={() => !added && onAdd(track)}
                disabled={added}
                aria-label="Add"
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
    </>
  );
}

type SunoUser = { handle: string; display_name: string; avatar_url: string; followers: number };
type SunoPlaylistHit = { id: string; name: string; cover_url: string; song_count: number; user: string };

/* Search all of Suno (songs, genres, users, playlists) via the unofficial API. */
function SunoSearch({
  isAdded, onAddTrack, onAddSource,
}: {
  isAdded: (id: string) => boolean;
  onAddTrack: (t: Track) => void;
  onAddSource: (id: string, name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"song" | "tag" | "user" | "playlist">("song");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [users, setUsers] = useState<SunoUser[]>([]);
  const [playlists, setPlaylists] = useState<SunoPlaylistHit[]>([]);
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userHandle, setUserHandle] = useState("");

  async function run(fromIndex = 0) {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setError("");
    setUserHandle("");
    const res = await fetch(
      `/api/suno-search?type=${type}&q=${encodeURIComponent(term)}&index=${fromIndex}`,
      { headers: { "X-Admin-Key": ADMIN_KEY } },
    );
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Search failed"); return; }
    setTotal(data.total ?? 0);
    setIndex(fromIndex);
    const rs = data.results ?? [];
    if (type === "song" || type === "tag") {
      setTracks(prev => (fromIndex ? [...prev, ...rs] : rs));
      setUsers([]); setPlaylists([]);
    } else if (type === "user") {
      setUsers(rs); setTracks([]); setPlaylists([]);
    } else {
      setPlaylists(rs); setTracks([]); setUsers([]);
    }
  }

  const [userPage, setUserPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  async function openUser(handle: string, page = 1, append = false) {
    if (append) setLoadingMore(true); else setLoading(true);
    setError("");
    const res = await fetch(`/api/suno-user/${handle}?page=${page}`, { headers: { "X-Admin-Key": ADMIN_KEY } });
    const data = await res.json();
    if (append) setLoadingMore(false); else setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to load profile"); return; }
    setUserHandle(handle);
    setTracks(prev => append ? [...prev, ...(data.results ?? [])] : (data.results ?? []));
    setTotal(data.total ?? 0);
    setUserPage(page);
  }

  async function loadAllUserTracks(handle: string) {
    setLoadingMore(true);
    let page = 2;
    let loaded = tracks.length;
    let all = [...tracks];
    while (loaded < total) {
      const res = await fetch(`/api/suno-user/${handle}?page=${page}`, { headers: { "X-Admin-Key": ADMIN_KEY } });
      if (!res.ok) break;
      const data = await res.json();
      const results = data.results ?? [];
      if (!results.length) break;
      all = [...all, ...results];
      loaded = all.length;
      page++;
    }
    setTracks(all);
    setLoadingMore(false);
  }

  const showTracks = tracks.length > 0 && (type === "song" || type === "tag" || userHandle);

  return (
    <>
      <div style={{ padding: "0.875rem 1.25rem", borderBottom: `1px solid ${BORDER}`, flexShrink: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {([["song", "Songs"], ["tag", "Genre"], ["user", "People"], ["playlist", "Playlists"]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setType(k)}
              style={{
                padding: "0.25rem 0.7rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700,
                border: `1px solid ${type === k ? YELLOW : BORDER}`,
                background: type === k ? YELLOW : "transparent",
                color: type === k ? BG : TEXT, cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && run(0)}
            placeholder={type === "tag" ? "Genre or style, e.g. swing jazz…" : type === "user" ? "Artist name or handle…" : type === "playlist" ? "Playlist name…" : "Song title, lyrics, style…"}
            style={{
              flex: 1, minWidth: 0, padding: "0.5rem 0.75rem",
              background: CARD, color: TEXT, border: `1px solid ${BORDER}`,
              borderRadius: "0.5rem", fontSize: "0.875rem",
            }}
          />
          <button
            onClick={() => run(0)}
            style={{
              padding: "0.5rem 1rem", border: `2px solid ${YELLOW}`, borderRadius: "0.5rem",
              background: YELLOW, color: BG, fontWeight: 800, cursor: "pointer", fontSize: "0.8rem", flexShrink: 0,
            }}
          >
            Search
          </button>
        </div>
        {total > 0 && !loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.35 }}>
              {userHandle ? `Tracks by @${userHandle} · ${total}` : `${total.toLocaleString()} results`}
              {userHandle && (
                <button
                  onClick={() => { setUserHandle(""); setTracks([]); setTotal(users.length); }}
                  style={{ marginLeft: "0.6rem", background: "none", border: "none", color: YELLOW, cursor: "pointer", fontSize: "0.7rem", fontWeight: 700, padding: 0 }}
                >
                  ← back to people
                </button>
              )}
            </p>
            {showTracks && tracks.filter(t => !isAdded(t.id)).length > 0 && (
              <button
                onClick={() => tracks.filter(t => !isAdded(t.id)).forEach(t => onAddTrack(t))}
                style={{
                  padding: "0.2rem 0.6rem", border: `1px solid ${GREEN}`, borderRadius: "0.4rem",
                  background: "transparent", color: GREEN, fontWeight: 700, fontSize: "0.7rem", cursor: "pointer",
                }}
              >
                + All {tracks.filter(t => !isAdded(t.id)).length}
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && <p style={{ padding: "1.5rem", opacity: 0.4 }}>Searching…</p>}
        {error && <p style={{ padding: "1.5rem", color: PINK, fontSize: "0.85rem" }}>{error}</p>}
        {!loading && !error && !tracks.length && !users.length && !playlists.length && (
          <p style={{ padding: "1.5rem", opacity: 0.25, fontSize: "0.875rem" }}>
            Search Suno globally: songs by text, genres by tag, artists, public playlists.
          </p>
        )}

        {showTracks && tracks.map(track => {
          const added = isAdded(track.id);
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
                onClick={() => !added && onAddTrack(track)}
                disabled={added}
                aria-label="Add"
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
        {showTracks && tracks.length < total && (
          <div style={{ display: "flex", gap: "0.5rem", borderBottom: `1px solid ${BORDER}` }}>
            <button
              onClick={() => userHandle ? openUser(userHandle, userPage + 1, true) : run(index + 20)}
              disabled={loadingMore}
              style={{
                flex: 1, padding: "0.7rem", background: "transparent",
                border: "none",
                color: YELLOW, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
              }}
            >
              {loadingMore ? "Loading…" : `Load more… (${tracks.length}/${total})`}
            </button>
            {userHandle && (
              <button
                onClick={() => loadAllUserTracks(userHandle)}
                disabled={loadingMore}
                style={{
                  padding: "0.7rem 1rem", background: "transparent",
                  border: "none", borderLeft: `1px solid ${BORDER}`,
                  color: YELLOW, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                }}
              >
                Load all
              </button>
            )}
          </div>
        )}

        {users.map(u => (
          <div
            key={u.handle}
            style={{
              display: "flex", alignItems: "center", gap: "0.625rem",
              padding: "0.625rem 1.25rem", borderBottom: `1px solid ${BORDER}`,
            }}
          >
            {u.avatar_url
              ? <img src={u.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 38, height: 38, borderRadius: "50%", background: CARD, flexShrink: 0 }} />
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {u.display_name}
              </p>
              <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.45 }}>
                @{u.handle}{u.followers ? ` · ${u.followers.toLocaleString()} followers` : ""}
              </p>
            </div>
            <button
              onClick={() => openUser(u.handle)}
              style={{
                padding: "0.3rem 0.7rem", borderRadius: "999px", flexShrink: 0,
                border: `1px solid ${BORDER}`, background: "transparent", color: TEXT,
                cursor: "pointer", fontWeight: 700, fontSize: "0.72rem",
              }}
            >
              tracks ›
            </button>
          </div>
        ))}

        {playlists.map(p => (
          <div
            key={p.id}
            style={{
              display: "flex", alignItems: "center", gap: "0.625rem",
              padding: "0.625rem 1.25rem", borderBottom: `1px solid ${BORDER}`,
            }}
          >
            {p.cover_url
              ? <img src={p.cover_url} alt="" style={{ width: 38, height: 38, borderRadius: "0.3rem", objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 38, height: 38, borderRadius: "0.3rem", background: CARD, flexShrink: 0 }} />
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.name}
              </p>
              <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.45 }}>
                {p.user ? `by ${p.user}` : "playlist"}{p.song_count ? ` · ${p.song_count} tracks` : ""}
              </p>
            </div>
            <button
              onClick={() => onAddSource(p.id, p.name)}
              style={{
                padding: "0.3rem 0.7rem", borderRadius: "999px", flexShrink: 0,
                border: `2px solid ${GREEN}`, background: GREEN, color: BG,
                cursor: "pointer", fontWeight: 800, fontSize: "0.72rem",
              }}
            >
              + source
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/* Meta editor for a custom playlist: name, description, card color. */
function CustomPlaylistEditor({
  pl, onSave,
}: {
  pl: CustomPlaylist;
  onSave: (id: string, meta: { name: string; description: string; accent: string }) => Promise<void>;
}) {
  const [name, setName] = useState(pl.name);
  const [description, setDescription] = useState(pl.description);
  const [accent, setAccent] = useState(pl.accent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(pl.name);
    setDescription(pl.description);
    setAccent(pl.accent);
  }, [pl]);

  async function save() {
    setSaving(true);
    await onSave(pl.id, { name: name.trim(), description: description.trim(), accent });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const dirty = name !== pl.name || description !== pl.description || accent !== pl.accent;

  return (
    <div style={{ padding: "0.75rem 1.25rem", borderBottom: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Playlist name"
        style={{
          padding: "0.4rem 0.6rem", background: "rgba(255,255,255,0.05)",
          border: `1px solid ${BORDER}`, borderRadius: "0.375rem",
          color: TEXT, fontSize: "0.85rem", width: "100%", fontWeight: 700,
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
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem" }}>
        <span style={{ fontSize: "0.65rem", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Card color
        </span>
        <button
          onClick={() => setAccent("")}
          aria-label="No accent"
          title="None"
          style={{
            width: 22, height: 22, borderRadius: "50%",
            border: `2px solid ${accent === "" ? TEXT : BORDER}`,
            background: "transparent", color: TEXT, cursor: "pointer",
            fontSize: "0.6rem", lineHeight: 1, padding: 0,
          }}
        >✕</button>
        {ACCENT_SWATCHES.map(s => (
          <button
            key={s.key}
            onClick={() => setAccent(s.key)}
            aria-label={s.key}
            title={s.key}
            style={{
              width: 22, height: 22, borderRadius: "50%",
              border: `2px solid ${accent === s.key ? TEXT : "transparent"}`,
              background: s.hex, cursor: "pointer", padding: 0,
            }}
          />
        ))}
        <button
          onClick={save}
          disabled={!dirty || saving}
          style={{
            marginLeft: "auto",
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
  );
}

function AdminLogin({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  function attempt() {
    if (pw === ADMIN_KEY) {
      try { localStorage.setItem("ts-admin", "1"); } catch {}
      onAuth();
    } else {
      setErr(true);
      setTimeout(() => setErr(false), 1200);
    }
  }
  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: 280 }}>
        <span style={{ fontFamily: "Impact, serif", fontSize: "1.4rem", letterSpacing: "0.05em", color: TEXT }}>🎛 DJ ONLY</span>
        <input
          type="password"
          value={pw}
          autoFocus
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && attempt()}
          placeholder="Password"
          style={{
            padding: "0.75rem 1rem", background: CARD, color: TEXT,
            border: `2px solid ${err ? PINK : BORDER}`, borderRadius: "0.75rem",
            fontSize: "1rem", outline: "none", transition: "border 0.15s",
          }}
        />
        <button
          onClick={attempt}
          style={{
            padding: "0.75rem", borderRadius: "0.75rem",
            background: YELLOW, color: BG, fontWeight: 800, fontSize: "1rem",
            border: "none", cursor: "pointer",
          }}
        >
          Enter
        </button>
        {err && <p style={{ color: PINK, fontSize: "0.85rem", margin: 0 }}>Wrong password</p>}
      </div>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"mix" | "playlists" | "sources" | "orders" | "fresh">("mix");

  useEffect(() => {
    try { if (localStorage.getItem("ts-admin") === "1") setAuthed(true); } catch {}
  }, []);

  const [sources, setSources] = useState<Playlist[]>([]);
  const [newSourceId, setNewSourceId] = useState("");
  const [sourceMsg, setSourceMsg] = useState("");

  const [selectedSource, setSelectedSource] = useState("");
  const [sourceTracks, setSourceTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [trackError, setTrackError] = useState("");

  const [queue, setQueue] = useState<Track[]>([]);
  const [flashMsg, setFlashMsg] = useState("");

  const [customs, setCustoms] = useState<CustomPlaylist[]>([]);
  const [selectedCustom, setSelectedCustom] = useState("");
  const [customTracks, setCustomTracks] = useState<Track[]>([]);
  const [newCustomName, setNewCustomName] = useState("");

  const [browse, setBrowse] = useState<"sources" | "search">("sources");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewId, setPreviewId] = useState("");
  const togglePreview = useCallback((track: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (previewId === track.id) {
      audio.pause();
      setPreviewId("");
    } else {
      audio.src = track.audio_url;
      audio.play().catch(() => {});
      setPreviewId(track.id);
    }
  }, [previewId]);

  type Order = { id: string; name: string; description: string; style: string; status: string; created: string };
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { headers: adminHeaders });
      if (res.ok) setOrders(await res.json());
    } catch { /* ignore */ }
  }, []);

  type Snapshot = { name: string; tracks: Track[]; saved: string };
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [newSnapName, setNewSnapName] = useState("");

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await fetch("/api/snapshots", { headers: adminHeaders });
      if (res.ok) setSnapshots(await res.json());
    } catch {}
  }, []);

  const saveSnapshot = useCallback(async () => {
    const name = newSnapName.trim();
    if (!name || !queue.length) return;
    await fetch("/api/snapshots", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ name, tracks: queue }),
    });
    setNewSnapName("");
    loadSnapshots();
  }, [newSnapName, queue, loadSnapshots]);

  const loadSnapshot = useCallback(async (snap: Snapshot) => {
    await fetch("/api/queue", {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify(snap.tracks),
    });
    await loadQueue();
    flash(`Loaded: ${snap.name}`);
  }, []);

  const deleteSnapshot = useCallback(async (name: string) => {
    await fetch(`/api/snapshots?name=${encodeURIComponent(name)}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    loadSnapshots();
  }, [loadSnapshots]);

  const today = new Date().toISOString().slice(0, 10);
  const [freshDate, setFreshDate] = useState(today);
  const [freshTracks, setFreshTracks] = useState<Track[]>([]);
  const [freshDates, setFreshDates] = useState<string[]>([]);

  const loadFreshForDate = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/fresh?date=${date}`);
      const data = await res.json();
      setFreshTracks(Array.isArray(data) ? data : []);
    } catch { setFreshTracks([]); }
  }, []);

  const loadFreshDates = useCallback(async () => {
    try {
      const res = await fetch("/api/fresh");
      const data = await res.json();
      if (data.dates) setFreshDates(data.dates);
    } catch {}
  }, []);

  const saveFresh = useCallback(async (date: string, tracks: Track[]) => {
    await fetch("/api/fresh", {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ date, tracks }),
    });
    loadFreshDates();
  }, [loadFreshDates]);

  useEffect(() => {
    if (tab === "fresh") {
      loadFreshForDate(freshDate);
      loadFreshDates();
    }
  }, [tab, freshDate, loadFreshForDate, loadFreshDates]);

  const addToFresh = useCallback((track: Track) => {
    setFreshTracks(prev => {
      if (prev.find(t => t.id === track.id)) return prev;
      const next = [...prev, track];
      saveFresh(freshDate, next);
      return next;
    });
  }, [freshDate, saveFresh]);

  const removeFromFresh = useCallback((id: string) => {
    setFreshTracks(prev => {
      const next = prev.filter(t => t.id !== id);
      saveFresh(freshDate, next);
      return next;
    });
  }, [freshDate, saveFresh]);

  const updateOrderStatus = async (id: string, status: string) => {
    await fetch("/api/orders", {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ id, status }),
    });
    loadOrders();
  };

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

  const loadCustoms = useCallback(async () => {
    const res = await fetch("/api/custom-playlists");
    const data = await res.json();
    setCustoms(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    loadSources();
    loadQueue();
    loadCustoms();
    loadOrders();
    loadSnapshots();
  }, [loadSources, loadQueue, loadCustoms, loadOrders, loadSnapshots]);

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

  function selectSource(id: string) {
    setSelectedSource(id);
    loadSourceTracks(id);
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

  async function addSourceById(id: string, name: string) {
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (res.ok) { flash(`Source added: ${data.name || name}`); await loadSources(); }
    else flash(data.error === "exists" ? "Already a source" : (data.error ?? "error"));
  }

  async function removeSource(id: string) {
    await fetch(`/api/playlists/${id}`, { method: "DELETE", headers: adminHeaders });
    if (selectedSource === id) { setSelectedSource(""); setSourceTracks([]); }
    await loadSources();
  }

  // ── custom playlists ──

  async function createCustom() {
    const name = newCustomName.trim();
    if (!name) return;
    const res = await fetch("/api/custom-playlists", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewCustomName("");
      await loadCustoms();
      setSelectedCustom(data.id);
      setCustomTracks([]);
      flash(`Created: ${name}`);
    } else {
      flash(data.error ?? "error");
    }
  }

  async function deleteCustom(id: string) {
    await fetch(`/api/custom-playlists/${id}`, { method: "DELETE", headers: adminHeaders });
    if (selectedCustom === id) { setSelectedCustom(""); setCustomTracks([]); }
    await loadCustoms();
  }

  async function loadCustomTracks(id: string) {
    if (!id) { setCustomTracks([]); return; }
    const res = await fetch(`/api/custom-playlists/${id}/tracks`);
    const data = await res.json();
    setCustomTracks(Array.isArray(data) ? data : []);
  }

  function selectCustom(id: string) {
    setSelectedCustom(id);
    loadCustomTracks(id);
  }

  async function saveCustomMeta(id: string, meta: { name: string; description: string; accent: string }) {
    await fetch(`/api/custom-playlists/${id}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify(meta),
    });
    await loadCustoms();
  }

  async function saveCustomTracks(next: Track[]) {
    if (!selectedCustom) return;
    setCustomTracks(next);
    await fetch(`/api/custom-playlists/${selectedCustom}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ tracks: next }),
    });
    await loadCustoms();
  }

  function addToCustom(track: Track) {
    if (!selectedCustom) { flash("Create or select a playlist first"); return; }
    if (customTracks.find(t => t.id === track.id)) { flash("Already in playlist"); return; }
    saveCustomTracks([...customTracks, track]);
    flash(`+ ${track.title}`);
  }

  function removeFromCustom(trackId: string) {
    saveCustomTracks(customTracks.filter(t => t.id !== trackId));
  }

  const inQueue = new Set(queue.map(t => t.id));
  const inCustom = new Set(customTracks.map(t => t.id));
  const currentCustom = customs.find(p => p.id === selectedCustom);

  const browseToggle = (
    <div style={{ display: "flex", gap: "0.4rem", padding: "0.75rem 1.25rem 0.6rem", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
      {(["sources", "search"] as const).map(m => (
        <button
          key={m}
          onClick={() => setBrowse(m)}
          style={{
            padding: "0.3rem 0.85rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700,
            border: `1px solid ${browse === m ? TEXT : BORDER}`,
            background: browse === m ? TEXT : "transparent",
            color: browse === m ? BG : TEXT, cursor: "pointer",
          }}
        >
          {m === "sources" ? "My sources" : "🔎 Search Suno"}
        </button>
      ))}
    </div>
  );

  if (!authed) return <AdminLogin onAuth={() => setAuthed(true)} />;

  return (
    <div style={{ minHeight: "100vh", height: "100vh", background: BG, color: TEXT, fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <audio ref={audioRef} preload="none" onEnded={() => setPreviewId("")} />

      {/* Header */}
      <div style={{ padding: "0.6rem 1.5rem", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        <span style={{ fontFamily: "Impact, serif", fontSize: "1.2rem", letterSpacing: "0.05em", flexShrink: 0 }}>
          🎛 DJ
        </span>

        {/* Player bar */}
        {(() => {
          const activeTrack = previewId ? (
            [...queue, ...sourceTracks, ...customTracks, ...freshTracks].find(t => t.id === previewId)
          ) : queue[0];
          const isPreview = !!previewId;
          return activeTrack ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flex: 1, minWidth: 0 }}>
              {/* Cover */}
              <div style={{ position: "relative", flexShrink: 0, cursor: "pointer" }} onClick={() => isPreview && togglePreview(activeTrack)}>
                {activeTrack.image_url
                  ? <img src={activeTrack.image_url} alt="" style={{ width: 44, height: 44, borderRadius: "0.4rem", objectFit: "cover", display: "block", border: `2px solid ${isPreview ? PINK : BORDER}` }} />
                  : <div style={{ width: 44, height: 44, borderRadius: "0.4rem", background: CARD, border: `2px solid ${isPreview ? PINK : BORDER}` }} />
                }
                {isPreview && (
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", borderRadius: "0.3rem", color: "#fff", fontSize: "0.7rem" }}>
                    ❚❚
                  </span>
                )}
              </div>
              {/* Info */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {activeTrack.title}
                </p>
                <p style={{ margin: 0, fontSize: "0.68rem", opacity: 0.45 }}>
                  {isPreview ? "▶ preview" : "Main Mix #1"}{activeTrack.artist ? ` · ${activeTrack.artist}` : ""}
                </p>
              </div>
              {/* Stop preview */}
              {isPreview && (
                <button
                  onClick={() => togglePreview(activeTrack)}
                  style={{ padding: "0.25rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, border: `1px solid ${PINK}`, background: "transparent", color: PINK, cursor: "pointer", flexShrink: 0 }}
                >
                  stop
                </button>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, fontSize: "0.75rem", opacity: 0.25 }}>Mix is empty</div>
          );
        })()}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
          {(["mix", "playlists", "sources", "orders", "fresh"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "0.3rem 0.85rem", borderRadius: "999px",
                border: `2px solid ${tab === t ? YELLOW : BORDER}`,
                background: tab === t ? YELLOW : "transparent",
                color: tab === t ? BG : TEXT,
                fontWeight: 700, cursor: "pointer", fontSize: "0.75rem",
              }}
            >
              {t === "mix" ? "Mix" : t === "playlists" ? "Playlists" : t === "sources" ? "Sources" : t === "fresh" ? "Fresh" : `Orders${orders.filter(o => o.status === "new").length ? ` (${orders.filter(o => o.status === "new").length})` : ""}`}
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

          {/* Left — source browser / suno search */}
          <div style={{ borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, overflow: "hidden" }}>
            {browseToggle}
            {browse === "sources" ? (
              <SourceBrowser
                sources={sources}
                selected={selectedSource}
                onSelect={selectSource}
                tracks={sourceTracks}
                loading={loadingTracks}
                error={trackError}
                isAdded={id => inQueue.has(id)}
                onAdd={addToMix}
                onAddAll={() => sourceTracks.filter(t => !inQueue.has(t.id)).forEach(addToMix)}
                previewId={previewId}
                onPreview={togglePreview}
              />
            ) : (
              <SunoSearch
                isAdded={id => inQueue.has(id)}
                onAddTrack={addToMix}
                onAddSource={addSourceById}
              />
            )}
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

            {/* Snapshot save bar */}
            <div style={{ padding: "0.5rem 1.25rem", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              <input
                value={newSnapName}
                onChange={e => setNewSnapName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveSnapshot()}
                placeholder="Save as…"
                style={{
                  flex: 1, minWidth: 0, padding: "0.4rem 0.65rem",
                  background: "rgba(255,255,255,0.05)", color: TEXT,
                  border: `1px solid ${BORDER}`, borderRadius: "0.4rem", fontSize: "0.8rem",
                }}
              />
              <button
                onClick={saveSnapshot}
                disabled={!newSnapName.trim() || !queue.length}
                style={{
                  padding: "0.4rem 0.85rem", borderRadius: "0.4rem", fontSize: "0.75rem", fontWeight: 800,
                  border: `1px solid ${YELLOW}`, background: newSnapName.trim() && queue.length ? YELLOW : "transparent",
                  color: newSnapName.trim() && queue.length ? BG : TEXT,
                  cursor: newSnapName.trim() && queue.length ? "pointer" : "default", flexShrink: 0,
                }}
              >
                Save
              </button>
            </div>

            {/* Snapshot list */}
            {snapshots.length > 0 && (
              <div style={{ padding: "0.4rem 1.25rem", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: "0.35rem", overflowX: "auto", flexShrink: 0 }}>
                {snapshots.map(s => (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
                    <button
                      onClick={() => loadSnapshot(s)}
                      title={`${s.tracks.length} tracks · ${new Date(s.saved).toLocaleDateString()}`}
                      style={{
                        padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700,
                        border: `1px solid ${BORDER}`, background: "transparent", color: TEXT,
                        cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      {s.name} <span style={{ opacity: 0.4 }}>({s.tracks.length})</span>
                    </button>
                    <button
                      onClick={() => deleteSnapshot(s.name)}
                      style={{ background: "none", border: "none", color: PINK, cursor: "pointer", fontSize: "0.65rem", padding: "0 0.2rem", lineHeight: 1 }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto" }}>
              {queue.length === 0 && (
                <p style={{ padding: "1.5rem", opacity: 0.25, fontSize: "0.875rem" }}>
                  The mix is empty — add tracks from the source browser
                </p>
              )}
              {queue.map((track, i) => {
                const isPlaying = previewId === track.id;
                return (
                <div
                  key={track.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    padding: "0.625rem 1.25rem", borderBottom: `1px solid ${BORDER}`,
                    background: isPlaying ? "rgba(242,92,162,0.06)" : "transparent",
                  }}
                >
                  <span style={{ fontSize: "0.7rem", opacity: 0.25, width: 18, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                  <button
                    onClick={() => togglePreview(track)}
                    style={{ width: 38, height: 38, borderRadius: "0.3rem", flexShrink: 0, border: "none", padding: 0, cursor: "pointer", position: "relative", background: CARD, overflow: "hidden" }}
                    aria-label={isPlaying ? "Pause" : "Play preview"}
                  >
                    {track.image_url && <img src={track.image_url} alt="" style={{ width: 38, height: 38, objectFit: "cover", display: "block" }} />}
                    <span style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: isPlaying ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.25)", color: "#fff", fontSize: "0.75rem",
                    }}>{isPlaying ? "❚❚" : "▶"}</span>
                  </button>
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
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PLAYLISTS TAB */}
      {tab === "playlists" && (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>

          {/* Left — source browser / suno search */}
          <div style={{ borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, overflow: "hidden" }}>
            {browseToggle}
            {browse === "sources" ? (
              <SourceBrowser
                sources={sources}
                selected={selectedSource}
                onSelect={selectSource}
                tracks={sourceTracks}
                loading={loadingTracks}
                error={trackError}
                isAdded={id => inCustom.has(id)}
                onAdd={addToCustom}
                onAddAll={() => sourceTracks.filter(t => !inCustom.has(t.id)).forEach(addToCustom)}
                previewId={previewId}
                onPreview={togglePreview}
              />
            ) : (
              <SunoSearch
                isAdded={id => inCustom.has(id)}
                onAddTrack={addToCustom}
                onAddSource={addSourceById}
              />
            )}
          </div>

          {/* Right — custom playlist panel */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
            <div style={{ padding: "0.875rem 1.25rem", borderBottom: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <select
                  value={selectedCustom}
                  onChange={e => selectCustom(e.target.value)}
                  style={{
                    flex: 1, padding: "0.55rem 0.75rem",
                    background: CARD, color: TEXT, border: `1px solid ${BORDER}`,
                    borderRadius: "0.5rem", fontSize: "0.875rem", minWidth: 0,
                  }}
                >
                  <option value="">Pick a playlist…</option>
                  {customs.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.track_count})</option>
                  ))}
                </select>
                {selectedCustom && customTracks.length > 0 && (
                  <button
                    onClick={() => saveCustomTracks([])}
                    title="Clear all tracks"
                    style={{
                      padding: "0 0.7rem", border: `1px solid ${BORDER}`, borderRadius: "0.5rem",
                      background: "transparent", color: TEXT, cursor: "pointer", fontSize: "0.72rem",
                      fontWeight: 700, flexShrink: 0, opacity: 0.5,
                    }}
                  >Clear</button>
                )}
                {selectedCustom && (
                  <button
                    onClick={() => deleteCustom(selectedCustom)}
                    aria-label="Delete playlist"
                    title="Delete playlist"
                    style={{
                      padding: "0 0.7rem", border: `1px solid ${BORDER}`, borderRadius: "0.5rem",
                      background: "transparent", color: PINK, cursor: "pointer", fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >✕</button>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  value={newCustomName}
                  onChange={e => setNewCustomName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createCustom()}
                  placeholder="New playlist name…"
                  style={{
                    flex: 1, padding: "0.45rem 0.75rem", minWidth: 0,
                    background: "rgba(255,255,255,0.05)", color: TEXT,
                    border: `1px solid ${BORDER}`, borderRadius: "0.5rem", fontSize: "0.85rem",
                  }}
                />
                <button
                  onClick={createCustom}
                  style={{
                    padding: "0.45rem 1rem", border: `2px solid ${YELLOW}`,
                    borderRadius: "0.5rem", background: YELLOW, color: BG,
                    fontWeight: 800, cursor: "pointer", fontSize: "0.8rem", flexShrink: 0,
                  }}
                >
                  Create
                </button>
              </div>
            </div>

            {currentCustom && (
              <CustomPlaylistEditor pl={currentCustom} onSave={saveCustomMeta} />
            )}

            <div style={{ flex: 1, overflowY: "auto" }}>
              {!selectedCustom && (
                <p style={{ padding: "1.5rem", opacity: 0.25, fontSize: "0.875rem" }}>
                  Create a playlist or pick one, then add tracks from the source browser.
                  It will appear as a card in &quot;Tonight&apos;s Menu&quot; on the main site.
                </p>
              )}
              {selectedCustom && customTracks.length === 0 && (
                <p style={{ padding: "1.5rem", opacity: 0.25, fontSize: "0.875rem" }}>
                  Empty — add tracks from the source browser
                </p>
              )}
              {customTracks.map((track, i) => {
                const isPlaying = previewId === track.id;
                return (
                <div
                  key={track.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    padding: "0.625rem 1.25rem", borderBottom: `1px solid ${BORDER}`,
                    background: isPlaying ? "rgba(242,92,162,0.06)" : "transparent",
                  }}
                >
                  <span style={{ fontSize: "0.7rem", opacity: 0.25, width: 18, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                  <button
                    onClick={() => togglePreview(track)}
                    style={{ width: 38, height: 38, borderRadius: "0.3rem", flexShrink: 0, border: "none", padding: 0, cursor: "pointer", position: "relative", background: CARD, overflow: "hidden" }}
                    aria-label={isPlaying ? "Pause" : "Play preview"}
                  >
                    {track.image_url && <img src={track.image_url} alt="" style={{ width: 38, height: 38, objectFit: "cover", display: "block" }} />}
                    <span style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: isPlaying ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.25)", color: "#fff", fontSize: "0.75rem",
                    }}>{isPlaying ? "❚❚" : "▶"}</span>
                  </button>
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
                    onClick={() => removeFromCustom(track.id)}
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
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SOURCES TAB */}
      {tab === "sources" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          <p style={{ margin: "0 0 1.25rem", opacity: 0.45, fontSize: "0.82rem", maxWidth: 480 }}>
            Connect Suno playlists as track sources. They only feed the source browser —
            what shows on the site is the custom playlists you build in the Playlists tab.
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
              <div key={pl.id} style={{ border: `1px solid ${BORDER}`, borderRadius: "0.75rem", background: CARD, padding: "0.75rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
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
                  onClick={() => removeSource(pl.id)}
                  aria-label="Remove"
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    border: `1px solid ${BORDER}`, background: "transparent",
                    color: PINK, cursor: "pointer", fontWeight: 900,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >✕</button>
              </div>
            ))}
            {sources.length === 0 && <p style={{ opacity: 0.35, fontSize: "0.875rem" }}>No sources yet.</p>}
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {tab === "orders" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
            <p style={{ margin: 0, opacity: 0.45, fontSize: "0.82rem" }}>
              Track requests from the site. Click status to cycle: new → cooking → done → rejected.
            </p>
            <button
              onClick={loadOrders}
              style={{ padding: "0.35rem 0.85rem", borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}
            >
              Refresh
            </button>
          </div>
          {orders.length === 0 && <p style={{ opacity: 0.35, fontSize: "0.875rem" }}>No orders yet.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", maxWidth: 640 }}>
            {orders.map(o => {
              const statusColors: Record<string, string> = { new: YELLOW, cooking: GREEN, done: "#999", rejected: PINK };
              const nextStatus: Record<string, string> = { new: "cooking", cooking: "done", done: "rejected", rejected: "new" };
              return (
                <div key={o.id} style={{ border: `1px solid ${BORDER}`, borderRadius: "0.75rem", background: CARD, padding: "0.875rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: 800, fontSize: "0.95rem", flex: 1 }}>{o.name}</span>
                    <button
                      onClick={() => updateOrderStatus(o.id, nextStatus[o.status] || "new")}
                      style={{
                        padding: "0.2rem 0.7rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 800,
                        border: `2px solid ${statusColors[o.status] || BORDER}`,
                        background: statusColors[o.status] || "transparent",
                        color: BG, cursor: "pointer", textTransform: "uppercase",
                      }}
                    >
                      {o.status}
                    </button>
                    <span style={{ fontSize: "0.65rem", opacity: 0.3 }}>
                      {new Date(o.created).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 0.3rem", fontSize: "0.85rem", opacity: 0.8 }}>{o.description}</p>
                  {o.style && <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.4 }}>Style: {o.style}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FRESH TAB */}
      {tab === "fresh" && (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>

          {/* Left — source browser / suno search */}
          <div style={{ borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, overflow: "hidden" }}>
            {browseToggle}
            {browse === "sources" ? (
              <SourceBrowser
                sources={sources}
                selected={selectedSource}
                onSelect={selectSource}
                tracks={sourceTracks}
                loading={loadingTracks}
                error={trackError}
                isAdded={id => freshTracks.some(t => t.id === id)}
                onAdd={addToFresh}
                onAddAll={() => sourceTracks.filter(t => !freshTracks.some(f => f.id === t.id)).forEach(addToFresh)}
                previewId={previewId}
                onPreview={togglePreview}
              />
            ) : (
              <SunoSearch
                isAdded={id => freshTracks.some(t => t.id === id)}
                onAddTrack={addToFresh}
                onAddSource={addSourceById}
              />
            )}
          </div>

          {/* Right — date picker + fresh tracks */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
            {/* Date nav */}
            <div style={{ padding: "0.875rem 1.25rem", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: "0.9rem", flex: 1 }}>
                  Fresh out of the kitchen
                </p>
                <span style={{ fontSize: "0.7rem", opacity: 0.4 }}>{freshTracks.length} / 6 tracks</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={() => {
                    const d = new Date(freshDate);
                    d.setDate(d.getDate() - 1);
                    setFreshDate(d.toISOString().slice(0, 10));
                  }}
                  style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, cursor: "pointer", fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                >‹</button>
                <input
                  type="date"
                  value={freshDate}
                  onChange={e => setFreshDate(e.target.value)}
                  style={{
                    padding: "0.4rem 0.6rem", background: CARD, color: TEXT,
                    border: `1px solid ${BORDER}`, borderRadius: "0.5rem",
                    fontSize: "0.85rem", fontWeight: 700, colorScheme: "dark",
                  }}
                />
                <button
                  onClick={() => {
                    const d = new Date(freshDate);
                    d.setDate(d.getDate() + 1);
                    setFreshDate(d.toISOString().slice(0, 10));
                  }}
                  style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, cursor: "pointer", fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                >›</button>
                <button
                  onClick={() => setFreshDate(today)}
                  style={{
                    padding: "0.3rem 0.7rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700,
                    border: `1px solid ${freshDate === today ? YELLOW : BORDER}`,
                    background: freshDate === today ? YELLOW : "transparent",
                    color: freshDate === today ? BG : TEXT, cursor: "pointer",
                  }}
                >Today</button>
              </div>
            </div>

            {/* Event dates strip */}
            {freshDates.length > 0 && (
              <div style={{ padding: "0.5rem 1.25rem", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: "0.35rem", overflowX: "auto", flexShrink: 0 }}>
                {freshDates.map(d => (
                  <button
                    key={d}
                    onClick={() => setFreshDate(d)}
                    style={{
                      padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 700,
                      border: `1px solid ${freshDate === d ? GREEN : BORDER}`,
                      background: freshDate === d ? GREEN : "transparent",
                      color: freshDate === d ? BG : TEXT, cursor: "pointer",
                      whiteSpace: "nowrap", flexShrink: 0,
                    }}
                  >
                    {new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </button>
                ))}
              </div>
            )}

            {/* Track list for selected date */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {freshTracks.length === 0 && (
                <p style={{ padding: "1.5rem", opacity: 0.25, fontSize: "0.875rem" }}>
                  No tracks for {freshDate === today ? "today" : freshDate}. Add from the source browser.
                </p>
              )}
              {freshTracks.map((track, i) => (
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
                    onClick={() => removeFromFresh(track.id)}
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
    </div>
  );
}
