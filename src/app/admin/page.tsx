"use client";

import { useEffect, useState } from "react";

const ADMIN_KEY = "ts-admin-2026";

type Playlist = {
  id: string;
  name: string;
  song_count: number;
  cover_url: string;
};

export default function Admin() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newId, setNewId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/playlists");
    setPlaylists(await res.json());
  }

  useEffect(() => { load(); }, []);

  function extractId(raw: string) {
    // Accept full URL like suno.com/playlist/UUID or just UUID
    const m = raw.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    return m ? m[1] : raw.trim();
  }

  async function add() {
    const id = extractId(newId);
    if (!id) return;
    setLoading(true); setMsg("");
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (res.ok) { setMsg(`Added: ${data.name}`); setNewId(""); await load(); }
    else setMsg(data.error ?? "error");
    setLoading(false);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/playlists/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Key": ADMIN_KEY },
    });
    if (res.ok) { setMsg("Removed"); await load(); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#161210", color: "#FFFDF6", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontFamily: "Impact, serif", fontSize: "2.5rem", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
        🎛 PLAYLIST ADMIN
      </h1>
      <p style={{ opacity: 0.5, marginBottom: "2rem", fontSize: "0.85rem" }}>tracksnack.live</p>

      {/* Add */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <input
          value={newId}
          onChange={e => setNewId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Suno playlist URL or UUID"
          style={{
            flex: 1, minWidth: "260px", padding: "0.7rem 1rem",
            border: "2px solid #FFFDF6", borderRadius: "0.75rem",
            background: "transparent", color: "#FFFDF6", fontSize: "0.95rem",
          }}
        />
        <button
          onClick={add}
          disabled={loading}
          style={{
            padding: "0.7rem 1.5rem", border: "2px solid #FFD731",
            borderRadius: "0.75rem", background: "#FFD731", color: "#161210",
            fontWeight: 800, cursor: "pointer", fontSize: "0.95rem",
          }}
        >
          {loading ? "…" : "Add playlist"}
        </button>
      </div>
      {msg && <p style={{ marginBottom: "1.5rem", color: "#55DB9C", fontWeight: 700 }}>{msg}</p>}

      {/* List */}
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {playlists.map(pl => (
          <div key={pl.id} style={{
            border: "2px solid rgba(255,255,255,0.15)", borderRadius: "1rem",
            padding: "1rem", display: "flex", gap: "1rem", alignItems: "center",
          }}>
            {pl.cover_url
              ? <img src={pl.cover_url} alt="" style={{ width: 56, height: 56, borderRadius: "0.5rem", objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 56, height: 56, borderRadius: "0.5rem", background: "#2B2A28", flexShrink: 0 }} />
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "0.2rem" }}>{pl.name}</p>
              <p style={{ fontSize: "0.75rem", opacity: 0.5 }}>{pl.song_count} tracks · {pl.id.slice(0, 8)}…</p>
            </div>
            <button
              onClick={() => remove(pl.id)}
              style={{
                width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)",
                background: "transparent", color: "#F25CA2", cursor: "pointer", fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
        {playlists.length === 0 && <p style={{ opacity: 0.4 }}>No playlists yet.</p>}
      </div>
    </div>
  );
}
