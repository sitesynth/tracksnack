"use client";
/* eslint-disable @next/next/no-img-element */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { GENRES, type GenreKey } from "@/lib/genres";

type Track = {
  id: string;
  title: string;
  imageUrl: string;
  audioUrl: string;
  duration: string;
  genre: string;
  sunoUrl: string;
  likes: number;
  orderedFor?: string;
  description?: string;
};

type RawTrack = {
  id: string;
  title: string;
  audio_url: string;
  image_url: string;
  duration: number;
  ordered_for?: string;
  /** Our own editorial blurb about the track, shown in the expanded player. */
  description?: string;
};

type Playlist = {
  id: string;
  name: string;
  track_count: number;
  cover_url: string;
  description?: string;
  accent?: string;
};

// Admin-selectable card accents; keys map to palette vars in globals.css
const PLAYLIST_ACCENTS: Record<string, string> = {
  yellow: "var(--yellow)",
  mint: "var(--mint)",
  pink: "var(--pink)",
  violet: "var(--violet)",
  mustard: "var(--mustard)",
};

function fmtDuration(s: number | undefined): string {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/* ── Broadcast grid ───────────────────────────────
   The station clock: everyone computes the same "what's on air right now"
   from wall time, so a reload (or a new visitor) drops into the middle of
   the schedule instead of restarting from track 1. */
const BROADCAST_EPOCH = Date.UTC(2026, 0, 1);

function parseDur(d: string | undefined): number {
  if (!d) return 0;
  const [m, s] = d.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}

function broadcastPosition(tracks: Track[]): { idx: number; offset: number } {
  const durs = tracks.map(t => parseDur(t.duration) || 180);
  const total = durs.reduce((a, b) => a + b, 0);
  let t = ((Date.now() - BROADCAST_EPOCH) / 1000) % total;
  let idx = 0;
  while (t >= durs[idx]) {
    t -= durs[idx];
    idx = (idx + 1) % durs.length;
  }
  return { idx, offset: t };
}

function Scrubber({ progress, seekTo }: { progress: number; seekTo: (pct: number) => void }) {
  const dragging = useRef(false);
  const pct = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };
  return (
    <div
      className="player__scrubber"
      onPointerDown={e => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        seekTo(pct(e));
      }}
      onPointerMove={e => { if (dragging.current) seekTo(pct(e)); }}
      onPointerUp={e => {
        dragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => { dragging.current = false; }}
      /* keep the parent card's swipe-to-change-track gesture out of the scrubber */
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
    >
      <div className="player__scrubber-fill" style={{ width: `${progress * 100}%` }}>
        <div className="player__scrubber-thumb" />
      </div>
    </div>
  );
}

function mapTracks(raw: RawTrack[]): Track[] {
  return raw.map(t => ({
    id: t.id,
    title: t.title ?? "Untitled",
    imageUrl: t.image_url ?? "",
    audioUrl: t.audio_url ?? "",
    duration: t.duration
      ? `${Math.floor(t.duration / 60)}:${String(Math.floor(t.duration % 60)).padStart(2, "0")}`
      : "",
    genre: "",
    sunoUrl: `https://suno.com/song/${t.id}`,
    likes: 0,
    orderedFor: t.ordered_for,
    description: t.description,
  }));
}

const AUTHOR = "Chef Miguel";

const TICKER = [
  "NOW COOKING: opera about shawarma 🌯",
  "IN THE OVEN: hardbass Monday anthem 🔥",
  "JUST SERVED: disco track about your cat 🐱",
  "ORDER UP: country song for a birthday 🎂",
  "NOW COOKING: psychedelic funk burger 🍔",
];

const STEPS = [
  {
    n: "1",
    title: "Place your order",
    desc: `Drop a topic + a genre in the chat. "A track about my cat, Rammstein style" — that's a valid order.`,
  },
  {
    n: "2",
    title: "We cook it",
    desc: "5–7 minutes in the oven. While it bakes, the previous dish plays and the chef talks to the counter.",
  },
  {
    n: "3",
    title: "Served live",
    desc: "Fresh premiere on air. Chat votes: edible or inedible. Best dish of the night goes on the menu.",
  },
];

function Road() {
  return <div className="road" aria-hidden />;
}

const ORDER_GENRES = ["Rock", "Funk", "Jazz", "Disco", "Metal", "Surprise Me"] as const;
const ORDER_LANGS = ["EN", "ES", "PT", "RU", "FR", "DE", "IT", "UA"] as const;
const ORDER_MOODS = ["Funny", "Romantic", "Weird", "Dark", "Epic"] as const;
const ORDER_STEPS = [
  { icon: "🧾", label: "Order received" },
  { icon: "✍️", label: "Lyrics being chopped" },
  { icon: "🎸", label: "Style being seasoned" },
  { icon: "🔥", label: "Cooking" },
  { icon: "🎧", label: "Ready for tasting" },
];
/* Auto-advance stops at "Cooking" — the real bake takes 5–7 minutes and the
   premiere happens on air, so the last step stays honestly pending. */
const STEP_DELAYS = [0, 4000, 9000, 15000];

/* Food × music dish names — every order gets one, seeded by its ticket
   number so it survives re-renders. Reusable for premiere/share cards. */
const DISH_SOUND = ["Disco", "Funk", "Jazz", "Metal", "Surf-Rock", "Lo-Fi", "Psychedelic", "Honky-Tonk", "Bossa", "Techno"];
const DISH_FOOD = ["Gumbo", "Lasagna", "Burrito", "Ramen", "Pierogi", "Meatballs", "Cheesecake", "Shawarma", "Borscht", "Pancakes", "Goulash", "Paella"];
const DISH_TAIL = ["of Doom", "Deluxe", "Flambé", "à la Chef", "with Extra Sauce", "on the Rocks", "Supreme", ""];

function dishName(seed: number, genre?: string) {
  const sound = genre && genre !== "Surprise Me" ? genre : DISH_SOUND[seed % DISH_SOUND.length];
  const food = DISH_FOOD[Math.floor(seed / 7) % DISH_FOOD.length];
  const tail = DISH_TAIL[Math.floor(seed / 3) % DISH_TAIL.length];
  return [sound, food, tail].filter(Boolean).join(" ");
}

function shareOrder(orderNum: number, genre: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#F6EEDD";
  ctx.fillRect(0, 0, 720, 1280);

  // Red stripe top
  ctx.fillStyle = "#D6231F";
  ctx.fillRect(0, 0, 720, 18);

  // Red stripe bottom
  ctx.fillRect(0, 1262, 720, 18);

  // ORDER #
  ctx.fillStyle = "#7A3B1E";
  ctx.font = "bold 36px 'Arial Narrow', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`ORDER  #${orderNum}`, 360, 420);

  // Dish name
  ctx.fillStyle = "#161210";
  ctx.font = "bold 72px 'Arial Narrow', Arial, sans-serif";
  const dish = dishName(orderNum, genre);
  // Word wrap
  const words = dish.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > 640) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(`"${i === 0 ? "" : ""}${l}${i === lines.length - 1 ? '"' : ""}`, 360, 560 + i * 84));

  // Tagline
  ctx.fillStyle = "#161210";
  ctx.globalAlpha = 0.4;
  ctx.font = "28px Arial, sans-serif";
  ctx.fillText("I ordered a track at", 360, 800);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#D6231F";
  ctx.font = "bold 48px Arial, sans-serif";
  ctx.fillText("tracksnack.live", 360, 860);

  const link = document.createElement("a");
  link.download = `tracksnack-order-${orderNum}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

const STATUS_TO_STEP: Record<string, number> = {
  new: 0, lyrics: 1, writing: 1, style: 2, seasoning: 2, cooking: 3, generating: 3,
};

function OrderForm() {
  const [name, setName] = useState("");
  const [story, setStory] = useState("");
  const [genre, setGenre] = useState("");
  const [lang, setLang] = useState("EN");
  const [moods, setMoods] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [orderNum, setOrderNum] = useState<number | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [premierePhase, setPremierePhase] = useState<null | "countdown" | "live">(null);
  const [countdown, setCountdown] = useState(5);
  const stepTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleMood = (m: string) =>
    setMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  // Polling: check real backend status every 12s
  useEffect(() => {
    if (!orderId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) return;
        const data = await res.json();
        const s: string = (data.status ?? "").toLowerCase();
        if (s === "ready" || s === "done" || s === "complete" || s.includes("ready")) {
          clearInterval(pollRef.current!);
          setPremierePhase("countdown");
          return;
        }
        const mapped = STATUS_TO_STEP[s];
        if (mapped !== undefined) setStep(prev => Math.max(prev, mapped));
      } catch { /* ignore */ }
    }, 12000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [orderId]);

  // Countdown: 5 4 3 2 1 → live
  useEffect(() => {
    if (premierePhase !== "countdown") return;
    setCountdown(5);
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(t); setPremierePhase("live"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [premierePhase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !story.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: story.trim(),
          style: [genre, ...moods].filter(Boolean).join(", "),
          language: lang,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const raw = data?.id ?? data?.order_id;
      const num = typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? [...raw].reduce((a, c) => a + c.charCodeAt(0), 0) % 900 + 100
          : Math.floor(Math.random() * 900 + 100);
      setOrderNum(num);
      if (typeof raw === "string") setOrderId(raw);
      setStep(0);
      // Simulate early steps; real status from polling overrides later
      const timers = STEP_DELAYS.slice(1).map((delay, i) =>
        setTimeout(() => setStep(prev => Math.max(prev, i + 1)), delay)
      );
      stepTimersRef.current = timers;
    } catch { /* ignore */ }
    setSending(false);
  };

  return (
    <section
      id="order-track"
      className="rounded-xl px-5 md:px-12 py-12 md:py-16"
      style={{ background: "var(--paper)" }}
    >
      <div className="max-w-xl mx-auto text-center">
        <p className="text-5xl mb-4">📝</p>
        <h2 className="display text-3xl md:text-5xl mb-3">Order a track</h2>
        <p className="font-semibold opacity-70 max-w-md mx-auto mb-8">
          Tell the chef what you&apos;re craving — describe the vibe, mood, or story and our DJs will cook it up.
        </p>

        {premierePhase === "countdown" ? (
          <div className="order-premiere">
            <p className="order-premiere__alert">ORDER #{orderNum} IS READY</p>
            <p className="order-premiere__countdown">{countdown}</p>
          </div>
        ) : premierePhase === "live" ? (
          <div className="order-premiere order-premiere--live">
            <p className="order-premiere__world">WORLD PREMIERE</p>
            {orderNum !== null && (
              <p className="order-premiere__dish">"{dishName(orderNum, genre)}"</p>
            )}
            <div className="order-premiere__actions">
              <button className="pill pill-red" onClick={() => { setPremierePhase(null); setStep(-1); setOrderId(null); }}>Serve it again</button>
              <button className="pill pill-yellow" onClick={() => alert("Voted! Thanks.")}>Add to radio</button>
              <button className="pill pill-paper" onClick={() => { setPremierePhase(null); setStep(-1); setOrderId(null); setOrderNum(null); }}>Send it back</button>
            </div>
            {orderNum !== null && (
              <button className="order-premiere__share" onClick={() => shareOrder(orderNum, genre)}>
                Share your order
              </button>
            )}
          </div>
        ) : step >= 0 ? (
          <div className="order-theater">
            <p className="order-theater__num">ORDER #{orderNum}</p>
            {orderNum !== null && (
              <p className="order-theater__dish">"{dishName(orderNum, genre)}"</p>
            )}
            <ul className="order-theater__steps">
              {ORDER_STEPS.map((s, i) => (
                <li key={s.label} className={`order-theater__step${i <= step ? " is-done" : ""}${i === step ? " is-current" : ""}`}>
                  <span className="order-theater__icon">{s.icon}</span>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
            {step >= STEP_DELAYS.length - 1 && (
              <p className="order-theater__note">
                5–7 minutes in the oven. Your track premieres live on air — stay tuned.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="order-form">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="order-input"
            />

            <label className="order-form__label">Tell us your story</label>
            <textarea
              placeholder="A funk track about losing Wi-Fi during a date. Make it dramatic."
              value={story}
              onChange={e => setStory(e.target.value)}
              required
              rows={3}
              className="order-input"
            />

            <label className="order-form__label">Pick your flavor</label>
            <div className="order-tiles">
              {ORDER_GENRES.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(prev => prev === g ? "" : g)}
                  className={`order-tile${genre === g ? " is-selected" : ""}`}
                >
                  {g}
                </button>
              ))}
            </div>

            <label className="order-form__label">Choose language</label>
            <div className="order-tiles">
              {ORDER_LANGS.map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`order-tile${lang === l ? " is-selected" : ""}`}
                >
                  {l}
                </button>
              ))}
            </div>

            <label className="order-form__label">Add some spice</label>
            <div className="order-tiles">
              {ORDER_MOODS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMood(m)}
                  className={`order-tile${moods.includes(m) ? " is-selected" : ""}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={sending}
              className="pill pill-red text-lg mt-4 self-center"
              style={{ padding: "0.75rem 2rem" }}
            >
              {sending ? "Sending to kitchen…" : "Send to the kitchen"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

/* Some Suno covers are square files with solid bars baked in around a
   non-square artwork. Detect uniform edge bars via canvas and crop them
   so object-fit:cover can fill the frame with the actual art. */
const coverCropCache = new Map<string, string>();

function cropCoverBars(url: string): Promise<string> {
  const cached = coverCropCache.get(url);
  if (cached) return Promise.resolve(cached);
  return new Promise(resolve => {
    const done = (out: string) => {
      coverCropCache.set(url, out);
      resolve(out);
    };
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const S = 64;
        const probe = document.createElement("canvas");
        probe.width = S;
        probe.height = S;
        const pctx = probe.getContext("2d");
        if (!pctx) return done(url);
        pctx.drawImage(img, 0, 0, S, S);
        const px = pctx.getImageData(0, 0, S, S).data;
        const uniform = (idxs: number[]) => {
          const mn = [255, 255, 255], mx = [0, 0, 0];
          for (const i of idxs) {
            for (let c = 0; c < 3; c++) {
              const v = px[i * 4 + c];
              if (v < mn[c]) mn[c] = v;
              if (v > mx[c]) mx[c] = v;
            }
          }
          return mx[0] - mn[0] + (mx[1] - mn[1]) + (mx[2] - mn[2]) < 48;
        };
        const col = (x: number) => Array.from({ length: S }, (_, y) => y * S + x);
        const row = (y: number) => Array.from({ length: S }, (_, x) => y * S + x);
        const LIM = Math.floor(S * 0.4);
        let l = 0; while (l < LIM && uniform(col(l))) l++;
        let r = 0; while (r < LIM && uniform(col(S - 1 - r))) r++;
        let t = 0; while (t < LIM && uniform(row(t))) t++;
        let b = 0; while (b < LIM && uniform(row(S - 1 - b))) b++;
        if (l + r + t + b < 2) return done(url);
        const sx = Math.round(((l ? l + 1 : 0) / S) * img.naturalWidth);
        const ex = Math.round(((S - (r ? r + 1 : 0)) / S) * img.naturalWidth);
        const sy = Math.round(((t ? t + 1 : 0) / S) * img.naturalHeight);
        const ey = Math.round(((S - (b ? b + 1 : 0)) / S) * img.naturalHeight);
        const w = ex - sx, h = ey - sy;
        if (w <= 0 || h <= 0) return done(url);
        const out = document.createElement("canvas");
        out.width = w;
        out.height = h;
        const octx = out.getContext("2d");
        if (!octx) return done(url);
        octx.drawImage(img, sx, sy, w, h, 0, 0, w, h);
        done(out.toDataURL("image/jpeg", 0.92));
      } catch {
        done(url);
      }
    };
    img.onerror = () => done(url);
    img.src = url;
  });
}

/* Lazy Suno metadata for the current track: genre tags + artist with avatar. */
type TrackMeta = { tags: string; artist: string; handle: string; avatar_url: string; video_url?: string };
const trackMetaCache = new Map<string, TrackMeta>();

function useTrackMeta(id?: string): TrackMeta | null {
  const [meta, setMeta] = useState<TrackMeta | null>(id ? trackMetaCache.get(id) ?? null : null);
  useEffect(() => {
    if (!id) { setMeta(null); return; }
    const cached = trackMetaCache.get(id);
    if (cached) { setMeta(cached); return; }
    setMeta(null);
    let alive = true;
    fetch(`/api/track-meta/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(m => {
        if (m && !m.error) {
          trackMetaCache.set(id, m);
          if (alive) setMeta(m);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [id]);
  return meta;
}

/* Tags can be a long style prompt — take the first segment, word-trimmed. */
function genreLabel(tags: string): string {
  const skip = /^\d+\s*bpm$|^[a-z]m$|^\d+$/i;
  const parts = (tags || "").split(/[,.\n]/).map(s => s.trim().replace(/^an?\s+/i, "")).filter(s => s && !skip.test(s));
  const first = parts[0] ?? "";
  if (!first) return "";
  return first.length > 32 ? first.slice(0, 32).replace(/\s+\S*$/, "") + "…" : first;
}

function ArtistChip({ meta }: { meta: TrackMeta }) {
  if (!meta.artist) return null;
  const inner = (
    <>
      {meta.avatar_url && <img src={meta.avatar_url} alt="" className="chip-avatar" />}
      {meta.artist}
    </>
  );
  return meta.handle ? (
    <a
      className="chip"
      style={{ background: "var(--paper)" }}
      href={`https://suno.com/@${meta.handle}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {inner}
    </a>
  ) : (
    <span className="chip" style={{ background: "var(--paper)" }}>{inner}</span>
  );
}

type Comment = { id: string; name: string; text: string; created: string };

/* Comments for the track that's playing. The button lives in the player's
   control row and the thread opens underneath, so the state is shared. */
function useComments(trackId?: string) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setComments([]);
    setCount(0);
    if (!trackId) return;
    let alive = true;
    fetch(`/api/comments/${trackId}`).then(r => r.json()).then(data => {
      if (alive && Array.isArray(data)) { setComments(data); setCount(data.length); }
    }).catch(() => {});
    return () => { alive = false; };
  }, [trackId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackId || !name.trim() || !text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/comments/${trackId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), text: text.trim() }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments(prev => [c, ...prev]);
        setCount(prev => prev + 1);
        setText("");
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  return { open, setOpen, comments, count, name, setName, text, setText, sending, submit };
}
type CommentsState = ReturnType<typeof useComments>;

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z" />
    </svg>
  );
}

function CommentsButton({ c }: { c: CommentsState }) {
  return (
    <button
      onClick={() => c.setOpen(!c.open)}
      className={`player__like player__comments${c.open ? " is-open" : ""}`}
      aria-label={c.open ? "Hide comments" : `Comments (${c.count})`}
      aria-expanded={c.open}
    >
      <CommentIcon /> {c.count}
    </button>
  );
}

function CommentsPanel({ c }: { c: CommentsState }) {
  if (!c.open) return null;
  const ago = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (d < 1) return "just now";
    if (d < 60) return `${d}m`;
    if (d < 1440) return `${Math.floor(d / 60)}h`;
    return `${Math.floor(d / 1440)}d`;
  };
  return (
    <div className="comments-panel">
      <form onSubmit={c.submit} className="comments-form">
        <input
          type="text"
          placeholder="Name"
          value={c.name}
          onChange={e => c.setName(e.target.value)}
          required
          className="comments-input"
        />
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <input
            type="text"
            placeholder="Say something…"
            value={c.text}
            onChange={e => c.setText(e.target.value)}
            required
            className="comments-input"
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={c.sending} className="comments-send">
            {c.sending ? "…" : "→"}
          </button>
        </div>
      </form>
      {c.comments.length === 0 && <p className="comments-empty">No comments yet — be the first!</p>}
      {c.comments.map(m => (
        <div key={m.id} className="comments-item">
          <span className="comments-name">{m.name}</span>
          <span className="comments-ago">{ago(m.created)}</span>
          <p className="comments-text">{m.text}</p>
        </div>
      ))}
    </div>
  );
}

function useCroppedCover(url?: string): string | undefined {
  const [cover, setCover] = useState(url);
  useEffect(() => {
    setCover(url);
    if (!url) return;
    let alive = true;
    cropCoverBars(url).then(u => {
      if (alive && u !== url) setCover(u);
    });
    return () => { alive = false; };
  }, [url]);
  return cover;
}

/* Three glow colours pulled from the cover art, like a TV's ambient light:
   the picture is shrunk to a few pixels and the most colourful hue families
   win. Falls back to the brand colours if the image can't be read. */
const AURA_FALLBACK = ["hsl(52 100% 55%)", "hsl(340 100% 58%)", "hsl(190 100% 52%)"];
const auraCache = new Map<string, string[]>();

function useCoverColors(url?: string): string[] {
  const [colors, setColors] = useState<string[]>(url ? auraCache.get(url) ?? AURA_FALLBACK : AURA_FALLBACK);
  useEffect(() => {
    if (!url) { setColors(AURA_FALLBACK); return; }
    const hit = auraCache.get(url);
    if (hit) { setColors(hit); return; }
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let out = AURA_FALLBACK;
      try {
        const S = 24;
        const c = document.createElement("canvas");
        c.width = S; c.height = S;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, S, S);
          const px = ctx.getImageData(0, 0, S, S).data;
          // 6 hue families (60° each); weight = saturation × how much of the picture they cover
          const bins = Array.from({ length: 6 }, () => ({ w: 0, h: 0, s: 0, l: 0 }));
          for (let i = 0; i < px.length; i += 4) {
            const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
            const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
            const l = (mx + mn) / 2;
            if (d < 0.12 || l < 0.12 || l > 0.92) continue;
            const sat = d / (1 - Math.abs(2 * l - 1));
            let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
            h = (h * 60 + 360) % 360;
            const bin = bins[Math.floor(h / 60) % 6];
            const w = sat;
            bin.w += w; bin.h += h * w; bin.s += sat * w; bin.l += l * w;
          }
          const top = bins.filter(b => b.w > 0).sort((a, b) => b.w - a.w).slice(0, 3);
          if (top.length) {
            // Neon = fully saturated, bright, and the three hues clearly apart:
            // a hue too close to one already picked is swung ~110° away.
            const apart = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) >= 50; };
            const hues: number[] = [];
            for (const b of top) {
              const h = Math.round(b.h / b.w);
              if (hues.every(x => apart(x, h))) hues.push(h);
            }
            const base = hues[0];
            for (const off of [110, -110]) {
              if (hues.length < 3) {
                const h = (base + off + 360) % 360;
                if (hues.every(x => apart(x, h))) hues.push(h);
              }
            }
            while (hues.length < 3) hues.push((base + 180 + hues.length * 40) % 360);
            out = hues.map(h => `hsl(${h} 100% 56%)`);
          }
        }
      } catch {}
      auraCache.set(url, out);
      if (alive) setColors(out);
    };
    img.onerror = () => { auraCache.set(url, AURA_FALLBACK); };
    img.src = url;
    return () => { alive = false; };
  }, [url]);
  return colors;
}

/* Text that scrolls back and forth when it doesn't fit its box, and stays
   still when it does. Speed follows how much has to be revealed. */
function Marquee({ text, className = "" }: { text: string; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const b = box.current, i = inner.current;
    if (!b || !i) return;
    const measure = () => {
      const over = i.scrollWidth - b.clientWidth;
      if (over > 4) {
        i.style.setProperty("--sx", `-${over + 8}px`);
        i.style.animationDuration = `${Math.max(8, 5 + over / 25)}s`;
        i.classList.add("scrolling");
      } else {
        i.style.removeProperty("--sx");
        i.style.removeProperty("animation-duration");
        i.classList.remove("scrolling");
      }
    };
    measure();
    if (!("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(measure);
    ro.observe(b);
    return () => ro.disconnect();
  }, [text]);
  return (
    <span ref={box} className={`marquee-box ${className}`}>
      <span ref={inner} className="player__song-text">{text}</span>
    </span>
  );
}

/* Chunky left arrow with a hard extrusion — same flat-3D look as the site's buttons. */
function BackIcon() {
  const d = "M3 12l8-8v5h9v6h-9v5z";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden style={{ overflow: "visible" }}>
      <path d={d} transform="translate(2.2 2.2)" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d={d} fill="var(--red)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 15V3" />
      <path d="M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}

/* The one shared player. Home owns the only <audio> pair; every card on the
   page (Fresh, Today's specials) just asks it to play a list. */
type PlayerApi = {
  sourceKey: string;
  playing: boolean;
  currId: string | undefined;
  playList: (key: string, name: string, raw: RawTrack[], start?: number) => void;
  toggle: () => void;
  skip: (dir: 1 | -1) => void;
  likedIds: Set<string>;
  likeCounts: Record<string, number>;
  toggleLike: (id: string) => void;
  openPlayer: () => void;
};
const PlayerCtx = createContext<PlayerApi | null>(null);

const FRESH_PAGE = 5;

/* Round page buttons with chevrons, same chunky style as the rest. */
function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages < 2) return null;
  // 1 … 4 5 6 … 9 — always first, last and the neighbours of the current page
  const show = Array.from({ length: pages }, (_, i) => i).filter(i => i === 0 || i === pages - 1 || Math.abs(i - page) <= 1);
  const chev = (dir: 1 | -1) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === -1 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
  return (
    <nav className="pager" aria-label="Pages">
      <button className="pager__btn" onClick={() => onPage(page - 1)} disabled={page === 0} aria-label="Previous page">{chev(-1)}</button>
      {show.map((i, k) => (
        <span key={i} className="pager__item">
          {k > 0 && i - show[k - 1] > 1 && <span className="pager__gap" aria-hidden>…</span>}
          <button
            className={`pager__btn${i === page ? " is-on" : ""}`}
            onClick={() => onPage(i)}
            aria-label={`Page ${i + 1}`}
            aria-current={i === page ? "page" : undefined}
          >{i + 1}</button>
        </span>
      ))}
      <button className="pager__btn" onClick={() => onPage(page + 1)} disabled={page === pages - 1} aria-label="Next page">{chev(1)}</button>
    </nav>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </svg>
  );
}

type SearchHit = RawTrack & { source: { key: string; name: string } };

/* A die drawn in the site's flat-3D style (hard extrusion), showing 1–6 pips. */
const PIPS: Record<number, [number, number][]> = {
  1: [[12, 12]],
  2: [[8, 8], [16, 16]],
  3: [[8, 8], [12, 12], [16, 16]],
  4: [[8, 8], [16, 8], [8, 16], [16, 16]],
  5: [[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]],
  6: [[8, 8], [16, 8], [8, 12], [16, 12], [8, 16], [16, 16]],
};
function DiceIcon({ face, size = 30 }: { face: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ overflow: "visible" }}>
      <rect x="4.2" y="4.2" width="17" height="17" rx="4" fill="currentColor" />
      <rect x="2" y="2" width="17" height="17" rx="4" fill="var(--paper)" stroke="currentColor" strokeWidth="2" />
      {(PIPS[face] ?? PIPS[5]).map(([x, y], i) => (
        <circle key={i} cx={x - 1.2} cy={y - 1.2} r="1.5" fill="var(--red)" stroke="currentColor" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

/* One hand-drawn icon per genre, all in the same chunky stroke style. */
const GENRE_ICONS: Record<GenreKey, React.ReactNode> = {
  rock: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  pop: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  hiphop: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" /></>),
  electronic: <path d="M5 20V10M10 20V4M15 20V13M20 20V7" />,
  jazz: (<><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></>),
  funk: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /><path d="M12 6.5a5.5 5.5 0 0 1 5.5 5.5" /></>),
  folk: <path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15zM5 19l8-8" />,
  blues: <path d="M12 3C9 8 6 11 6 15a6 6 0 0 0 12 0c0-4-3-7-6-12z" />,
  metal: <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />,
  classical: <path d="m4 9 8-5 8 5zM6 10v8M10 10v8M14 10v8M18 10v8M4 20h16" />,
  ambient: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />,
  latin: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>),
};
const GENRE_COLORS = ["var(--paper)", "var(--mint)", "var(--pink)", "var(--cream)", "var(--violet)", "var(--mustard)"];

/* Search the whole library (radio queue, playlists, Fresh) by words and/or
   genre chips. Every hit is a normal card: tap to play it on the shared player. */
function SearchSection() {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<GenreKey[]>([]);
  const [limit, setLimit] = useState(20);
  const [res, setRes] = useState<{ total: number; hits: SearchHit[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(5);
  const [rolled, setRolled] = useState<SearchHit | null | "none">(null);

  const term = q.trim();
  const active = term.length >= 2 || picked.length > 0;

  useEffect(() => { setLimit(20); setRolled(null); }, [term, picked]);

  useEffect(() => {
    if (!active) { setRes(null); setBusy(false); return; }
    setBusy(true);
    let alive = true;
    const t = setTimeout(() => {
      const params = new URLSearchParams({ q: term, limit: String(limit) });
      if (picked.length) params.set("g", picked.join(","));
      fetch(`/api/search?${params}`)
        .then(r => r.json())
        .then(d => { if (alive) { setRes(d && Array.isArray(d.hits) ? d : { total: 0, hits: [] }); setBusy(false); } })
        .catch(() => { if (alive) setBusy(false); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [term, picked, limit, active]);

  /* Roll the die: spin for a second, then serve one random song (within the
     picked genres, if any). It only shows the card — a phone won't let sound
     start after a network wait, so the listener taps play. */
  async function roll() {
    if (rolling) return;
    setRolling(true);
    setRolled(null);
    const spin = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 110);
    const params = new URLSearchParams({ random: "1" });
    if (picked.length) params.set("g", picked.join(","));
    const [d] = await Promise.all([
      fetch(`/api/search?${params}`).then(r => r.json()).catch(() => null),
      new Promise(r => setTimeout(r, 1000)),
    ]);
    clearInterval(spin);
    setFace(1 + Math.floor(Math.random() * 6));
    setRolled(d?.hits?.[0] ?? "none");
    setRolling(false);
  }

  const toggleGenre = (k: GenreKey) => setPicked(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]));

  return (
    <section id="search" className="rounded-xl px-5 md:px-12 py-10 md:py-12" style={{ background: "var(--yellow)" }}>
      <div className="max-w-5xl mx-auto flex flex-col items-center">
        <div className="flex items-center justify-center gap-2.5 md:gap-3 mb-5">
          {/* explicit line break on phones so the box hugs the text and the die sits right next to it */}
          <h2 className="display text-3xl md:text-5xl text-center">
            <span className="block md:inline whitespace-nowrap">Find a track,</span>{" "}
            <span className="block md:inline whitespace-nowrap">get a snack</span>
          </h2>
          <button
            className={`dice-btn${rolling ? " is-rolling" : ""}`}
            onClick={roll}
            aria-label="Surprise me: pick a random song"
            title="Surprise me"
          >
            <DiceIcon face={face} />
          </button>
        </div>
        <div className="search-box">
          <span className="search-box__icon"><SearchIcon /></span>
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Title, name, playlist…"
            className="search-input"
            aria-label="Search songs"
            enterKeyHint="search"
            autoComplete="off"
          />
          {q && (
            <button className="search-box__clear" onClick={() => setQ("")} aria-label="Clear search">×</button>
          )}
        </div>
        <div className="genre-chips" role="group" aria-label="Filter by genre">
          {GENRES.map((g, i) => {
            const on = picked.includes(g.key);
            return (
              <button
                key={g.key}
                className={`genre-chip${on ? " is-on" : ""}`}
                style={{ background: on ? "var(--ink)" : GENRE_COLORS[i % GENRE_COLORS.length], color: on ? "var(--paper)" : "var(--ink)" }}
                onClick={() => toggleGenre(g.key)}
                aria-pressed={on}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {GENRE_ICONS[g.key]}
                </svg>
                {g.label}
              </button>
            );
          })}
        </div>
        {rolled && (
          <div className="flex flex-col items-center gap-3 w-full mt-6">
            {rolled === "none" ? (
              <p className="font-semibold text-center">Nothing came up. Roll again?</p>
            ) : (
              <>
                <p className="menu-type text-sm opacity-70">Random track</p>
                <PlaylistMiniPlayer
                  key={`roll-${rolled.id}`}
                  playlistId={rolled.source.key.startsWith("fresh-") ? rolled.source.key : `s-${rolled.id}`}
                  coverUrl={rolled.image_url}
                  name={rolled.source.key.startsWith("fresh-") ? "Fresh" : "Random"}
                  initialTracks={[rolled]}
                  compact
                />
              </>
            )}
          </div>
        )}
        {res && !rolled && (
          <div className="flex flex-col items-center gap-3 md:gap-4 w-full mt-6">
            {res.hits.length === 0 ? (
              <p className="font-semibold text-center">
                Nothing found. <a href="#order-track" className="underline">Order it fresh</a> instead?
              </p>
            ) : (
              <>
                <p className="menu-type text-sm opacity-70">{res.total} {res.total === 1 ? "song" : "songs"}</p>
                {res.hits.map(h => (
                  <PlaylistMiniPlayer
                    key={h.id}
                    playlistId={h.source.key.startsWith("fresh-") ? h.source.key : `s-${h.id}`}
                    coverUrl={h.image_url}
                    name={h.source.key.startsWith("fresh-") ? "Fresh" : "Search"}
                    initialTracks={[h]}
                    compact
                  />
                ))}
                {res.total > res.hits.length && (
                  <button className="pill pill-paper text-base" onClick={() => setLimit(l => l + 20)}>
                    Show more ({res.total - res.hits.length})
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {busy && !res && <p className="mt-4 font-semibold opacity-60">Searching…</p>}
      </div>
    </section>
  );
}

function PlaylistMiniPlayer({
  playlistId,
  coverUrl,
  name,
  description,
  accent,
  initialTracks,
  compact,
}: {
  playlistId: string;
  coverUrl: string;
  name: string;
  description?: string;
  accent?: string;
  /** Pre-loaded tracks (skips the custom-playlist fetch) — used by Fresh. */
  initialTracks?: RawTrack[];
  /** Single compact row instead of the playlist card. */
  compact?: boolean;
}) {
  const api = useContext(PlayerCtx)!;
  const [tracks, setTracks] = useState<RawTrack[]>(initialTracks ?? []);
  const [loading, setLoading] = useState(!initialTracks);

  useEffect(() => {
    if (initialTracks) return;
    fetch(`/api/custom-playlists/${playlistId}/tracks`)
      .then(r => r.json())
      .then(d => setTracks(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [playlistId, initialTracks]);

  const n = tracks.length;
  const isActive = api.sourceKey === playlistId;
  const idx = isActive ? Math.max(0, tracks.findIndex(t => t.id === api.currId)) : 0;
  const curr = tracks[idx];
  const playingHere = isActive && api.playing;
  const displayCover = curr?.image_url || coverUrl || "";
  const croppedCover = useCroppedCover(displayCover || undefined);
  const currMeta = useTrackMeta(curr?.id);
  const genre = currMeta ? genreLabel(currMeta.tags) : "";

  const onPlay = () => (isActive ? api.toggle() : api.playList(playlistId, name, tracks, 0));
  const liked = curr ? api.likedIds.has(curr.id) : false;
  const likeCount = curr ? (api.likeCounts[curr.id] ?? 0) : 0;

  const compactCard = curr && (
    <div className="panel flex flex-wrap items-center gap-x-3 gap-y-3 md:gap-4 !p-4 w-full max-w-xl">
      <div className="flex items-center gap-3 min-w-0 flex-1 basis-full md:basis-0">
        <button
          onClick={() => (isActive ? api.openPlayer() : onPlay())}
          aria-label={isActive ? "Open player" : `Play ${curr.title}`}
          className="w-16 h-16 rounded-xl border-2 shrink-0 overflow-hidden"
          style={{ borderColor: "var(--ink)", padding: 0, background: "none", cursor: "pointer", border: "2px solid var(--ink)" }}
        >
          <img src={croppedCover || displayCover} alt={curr.title} className="w-full h-full object-cover block" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="display text-base" style={{ overflowWrap: "anywhere" }}>{curr.title}</p>
          <p className="menu-type text-sm opacity-60"><Marquee text={genre} /></p>
          {curr.ordered_for && <p className="menu-type text-sm" style={{ color: "var(--red)" }}>for {curr.ordered_for}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 w-full md:w-auto">
        <button
          className={`player__like player__like--lg shrink-0 flex-1 md:flex-none${liked ? " is-liked" : ""}`}
          onClick={() => api.toggleLike(curr.id)}
          aria-label={liked ? "Unlike" : "Like"}
        >
          {liked ? "♥" : "♡"} {likeCount}
        </button>
        <button
          aria-label={playingHere ? "Pause" : `Play ${curr.title}`}
          onClick={onPlay}
          className="player__play shrink-0"
        >
          {playingHere ? "❚❚" : "▶"}
        </button>
      </div>
    </div>
  );

  if (compact && compactCard) return compactCard;

  return (
    <div className="playlist-mini">
      <div
        className="playlist-mini__band"
        style={{ background: PLAYLIST_ACCENTS[accent ?? ""] || "var(--cream-deep)" }}
      >
        <span className="playlist-mini__band-name">{name}</span>
        <span className="playlist-mini__band-count">{loading ? "…" : `${n} tracks`}</span>
      </div>
      <div className="playlist-mini__body">
        {description && <p className="playlist-mini__desc">{description}</p>}
        <div className="playlist-mini__top">
          {displayCover
            ? (
              <button
                className="playlist-mini__expand"
                onClick={() => (isActive ? api.openPlayer() : onPlay())}
                aria-label={isActive ? "Open player" : "Play"}
              >
                <img src={croppedCover || displayCover} alt={name} className="playlist-mini__thumb" />
              </button>
            )
            : <div className="playlist-mini__thumb playlist-mini__thumb--empty" aria-hidden />
          }
          <div className="playlist-mini__info">
            <p className="playlist-mini__label">Now serving</p>
            <p className="playlist-mini__track">
              {loading ? "…" : curr?.title || "—"}
              {playingHere && <span className="now-shelf__dot ml-2 inline-block" />}
            </p>
          </div>
        </div>
        <div className="playlist-mini__controls">
          <button className="player__nav" onClick={() => api.skip(-1)} disabled={!isActive || n < 2} aria-label="Previous">‹</button>
          <button className="player__play" onClick={onPlay} disabled={n === 0 || loading} aria-label={playingHere ? "Pause" : "Play"}>{playingHere ? "❚❚" : "▶"}</button>
          <button className="player__nav" onClick={() => api.skip(1)} disabled={!isActive || n < 2} aria-label="Next">›</button>
          {!loading && n > 0 && (
            <span className="playlist-mini__count">{idx + 1}/{n}</span>
          )}
          {curr && (
            <button
              className={`playlist-mini__like${liked ? " is-liked" : ""}`}
              onClick={() => api.toggleLike(curr.id)}
              aria-label={liked ? "Unlike" : "Like"}
            >
              {liked ? "♥" : "♡"} {likeCount}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const CROSSFADE_MS = 900;

// 0.1s of silence. Played once on the first tap so the *second* <audio>
// element counts as user-activated: phones only let an element start by
// itself later (next track, DJ intro, screen locked) if a tap started it once.
const SILENT_WAV = "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const crossfadeRef = useRef<HTMLAudioElement>(null);
  const crossfadingRef = useRef(false);
  const skipNextLoadRef = useRef(false);
  /* Which of the two <audio> elements is "front" right now. Crossfading just
     flips this pointer once the fade completes — it never reassigns .src on
     an already-playing element, which would force a reload/decode glitch. */
  const activeIsARef = useRef(true);
  const active = useCallback(
    () => (activeIsARef.current ? audioRef.current : crossfadeRef.current),
    []
  );
  const inactive = useCallback(
    () => (activeIsARef.current ? crossfadeRef.current : audioRef.current),
    []
  );
  const primedRef = useRef(false);
  const songTitleRef = useRef<HTMLSpanElement>(null);
  const nextTitleRef = useRef<HTMLSpanElement>(null);
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [playMode, setPlayMode] = useState<"seq" | "loop" | "random">("seq");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  /* Which list the shared player is playing: the station ("radio", with the
     broadcast grid) or a list started from a card (Fresh, a playlist). */
  const RADIO = { key: "radio", name: "Radio" };
  const [source, setSource] = useState(RADIO);
  const sourceRef = useRef(RADIO);
  const radioTracksRef = useRef<Track[]>([]);
  const [started, setStarted] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const heroPlayerRef = useRef<HTMLDivElement>(null);
  const [remaining, setRemaining] = useState<string>("");
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [freshTracks, setFreshTracks] = useState<RawTrack[]>([]);
  const [freshPage, setFreshPage] = useState(0);
  const [tipOpen, setTipOpen] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");

  /* Broadcast grid state: liveSync = following the station clock. Any manual
     navigation (prev/next, swipe, next-up, scrubber) leaves the live grid and
     turns the player into a free playlist until reload. */
  const liveSyncRef = useRef(true);
  const pendingSeekRef = useRef<number | null>(null);

  /* DJ intros + jingles: played on the shared audioRef between auto-advancing
     tracks only — manual prev/next stays an instant track switch. */
  const djManifestRef = useRef<{ intros: Set<string>; jingles: string[] }>({ intros: new Set(), jingles: [] });
  const djQueueRef = useRef<{ segs: string[]; idx: number; nextIdx: number } | null>(null);
  const trackIdxRef = useRef(0);
  useEffect(() => { trackIdxRef.current = trackIdx; }, [trackIdx]);

  useEffect(() => {
    fetch("/api/dj-manifest")
      .then(r => r.json())
      .then(d => {
        djManifestRef.current = { intros: new Set(d.intros ?? []), jingles: d.jingles ?? [] };
      })
      .catch(() => {});
  }, []);

  function djPrerollFor(track: Track): string[] {
    const segs: string[] = [];
    const { intros, jingles } = djManifestRef.current;
    if (jingles.length && Math.random() < 0.15) {
      const j = jingles[Math.floor(Math.random() * jingles.length)];
      segs.push(`/api/dj-audio/jingles/${encodeURIComponent(j)}`);
    }
    if (intros.has(track.id)) {
      segs.push(`/api/dj-audio/dj-cache/${track.id}.mp3`);
    }
    return segs;
  }

  /* Crossfades from whichever <audio> is currently front into nextSrc on the
     other one, then flips which element is "active" — never reassigns .src
     on the element that's mid-playback, which would force a reload/decode
     glitch. Every control (scrubber, mediaSession, advance...) reads through
     active()/inactive() so it automatically follows the flip. onComplete
     fires at flip time — callers update React state (trackIdx / djQueueRef)
     there to match. */
  function crossfadeTo(nextSrc: string, onComplete: () => void) {
    const from = active();
    const to = inactive();
    if (!from || !to) { onComplete(); return; }
    const fromEl: HTMLAudioElement = from;
    const toEl: HTMLAudioElement = to;
    cancelSeek();
    crossfadingRef.current = true;
    const startVol = fromEl.volume || 1;
    toEl.src = nextSrc;
    toEl.currentTime = 0;
    toEl.volume = 0;
    toEl.play().catch(() => {});
    const start = performance.now();
    let rafId = 0;
    let committed = false;
    // Commits exactly once: flips which element is "active" and resets the
    // guard. Called either by the rAF ramp reaching t=1, or — if rAF stalls
    // (e.g. the tab is backgrounded, where browsers throttle/pause rAF) — by
    // the setTimeout fallback below, so the player never gets stuck mid-fade.
    function commit() {
      if (committed) return;
      committed = true;
      cancelAnimationFrame(rafId);
      toEl.volume = 1;
      fromEl.pause();
      fromEl.volume = 1;
      activeIsARef.current = !activeIsARef.current;
      crossfadingRef.current = false;
      onComplete();
    }
    function step(now: number) {
      const t = Math.max(0, Math.min(1, (now - start) / CROSSFADE_MS));
      toEl.volume = t;
      fromEl.volume = Math.max(0, startVol * (1 - t));
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        commit();
      }
    }
    rafId = requestAnimationFrame(step);
    setTimeout(commit, CROSSFADE_MS + 150);
  }

  const selectTrack = (i: number | ((i: number) => number)) => {
    liveSyncRef.current = false;
    const targetIdx = typeof i === "function" ? i(trackIdxRef.current) : i;
    const targetTrack = tracks[targetIdx];
    if (playing && targetTrack && !crossfadingRef.current) {
      djQueueRef.current = null;
      crossfadeTo(targetTrack.audioUrl, () => {
        skipNextLoadRef.current = true;
        setTrackIdx(targetIdx);
      });
    } else {
      djQueueRef.current = null;
      setTrackIdx(targetIdx);
    }
  };

  /* A seek requested before the metadata arrived waits on the element. When
     the source changes (card tapped, back to radio, manual skip) that stale
     seek must go, or it fires on the new track's metadata. */
  const pendingSeekCancelRef = useRef<(() => void) | null>(null);
  function cancelSeek() {
    pendingSeekCancelRef.current?.();
    pendingSeekCancelRef.current = null;
  }

  function applySeek(a: HTMLAudioElement, offset: number) {
    cancelSeek();
    if (a.readyState >= 1) {
      a.currentTime = offset;
    } else {
      const onMeta = () => {
        a.currentTime = Math.min(offset, Math.max(0, (a.duration || offset + 1) - 1));
        cancelSeek();
      };
      a.addEventListener("loadedmetadata", onMeta);
      pendingSeekCancelRef.current = () => a.removeEventListener("loadedmetadata", onMeta);
    }
  }

  useEffect(() => {
    async function loadTracks() {
      const applyList = (list: Track[]) => {
        radioTracksRef.current = list;
        setTracks(list);
        if (list.length > 1) {
          const pos = broadcastPosition(list);
          pendingSeekRef.current = pos.offset;
          setTrackIdx(pos.idx);
        }
      };
      try {
        const qData = await fetch("/api/queue").then(r => r.json());
        if (Array.isArray(qData) && qData.length > 0) {
          applyList(mapTracks(qData));
          return;
        }
      } catch {}
      const data: Track[] = await fetch("/tracks.json").then(r => r.json()).catch(() => []);
      applyList(data);
    }
    loadTracks();
    fetch("/api/likes")
      .then(r => r.json())
      .then(setLikeCounts)
      .catch(() => {});
    try {
      const raw = localStorage.getItem("ts-liked-ids");
      if (raw) setLikedIds(new Set(JSON.parse(raw)));
    } catch {}
    fetch("/api/custom-playlists")
      .then(r => r.json())
      .then(d => setPlaylists(Array.isArray(d) ? d : []))
      .catch(() => {});
    // Newest first: today's list (last added on top), then earlier days.
    fetch("/api/fresh")
      .then(r => r.json())
      .then(async (d: { tracks?: RawTrack[]; dates?: string[]; date?: string }) => {
        if (!Array.isArray(d.tracks)) return;
        const seen = new Set<string>();
        const merge = (lists: RawTrack[][]) =>
          lists.flatMap(l => [...l].reverse()).filter(t => (seen.has(t.id) ? false : (seen.add(t.id), true)));
        setFreshTracks(merge([d.tracks]));
        const older = (d.dates ?? []).filter(x => d.date && x < d.date).slice(0, 12);
        if (!older.length) return;
        const rest = await Promise.all(
          older.map(x => fetch(`/api/fresh?date=${x}`).then(r => r.json()).then(a => (Array.isArray(a) ? a : [])).catch(() => []))
        );
        setFreshTracks(merge([d.tracks, ...rest]));
      })
      .catch(() => {});
    fetch("/api/config")
      .then(r => r.json())
      .then(d => { if (d.stream_url) setStreamUrl(d.stream_url); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const a = active();
    if (!a || !tracks.length) return;
    const track = tracks[trackIdx];
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
    } else {
      cancelSeek();
      a.src = track?.audioUrl ?? "";
      const seek = pendingSeekRef.current;
      if (seek !== null) {
        pendingSeekRef.current = null;
        if (seek > 2) applySeek(a, seek);
      }
      if (playing) a.play().catch(() => {});
    }
    setRemaining("");
    setProgress(0);
    setElapsed("");
    if ("mediaSession" in navigator && track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: sourceRef.current.key === "radio"
          ? AUTHOR
          : `${sourceRef.current.name}${track.orderedFor ? ` — for ${track.orderedFor}` : ""}`,
        // No `sizes`: cover art isn't actually square, and a declared size
        // that doesn't match the real image makes iOS drop the artwork
        // instead of just scaling it.
        artwork: track.imageUrl ? [{ src: track.imageUrl }] : [],
      });
    }
  }, [trackIdx, tracks]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [playing]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !tracks.length) return;
    const n = tracks.length;
    navigator.mediaSession.setActionHandler("play", () => { active()?.play().catch(() => {}); setPlaying(true); });
    navigator.mediaSession.setActionHandler("pause", () => { active()?.pause(); setPlaying(false); });
    navigator.mediaSession.setActionHandler("previoustrack", n > 1 ? () => selectTrack(i => (i - 1 + n) % n) : null);
    navigator.mediaSession.setActionHandler("nexttrack", n > 1 ? () => selectTrack(i => (i + 1) % n) : null);
    return () => {
      (["play","pause","previoustrack","nexttrack"] as MediaSessionAction[]).forEach(a => {
        navigator.mediaSession.setActionHandler(a, null);
      });
    };
  }, [tracks]);

  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const els = [audioRef.current, crossfadeRef.current].filter(
      (el): el is HTMLAudioElement => el !== null
    );
    if (!els.length) return;
    const fmt = (s: number) =>
      `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    // Bound to BOTH elements permanently — filtering by "is this the active
    // one right now" inside the handler avoids the race where React hasn't
    // yet rebound listeners to the newly-active element after a crossfade
    // flip, which let stale handlers double-fire on a reused element.
    const onTime = (e: Event) => {
      const a = e.currentTarget as HTMLAudioElement;
      if (a !== active()) return;
      if (isNaN(a.duration)) return;
      setRemaining(fmt(Math.max(0, a.duration - a.currentTime)));
      setElapsed(fmt(a.currentTime));
      setProgress(a.duration > 0 ? a.currentTime / a.duration : 0);
    };
    for (const el of els) {
      el.addEventListener("timeupdate", onTime);
      el.addEventListener("loadedmetadata", onTime);
    }
    return () => {
      for (const el of els) {
        el.removeEventListener("timeupdate", onTime);
        el.removeEventListener("loadedmetadata", onTime);
      }
    };
  }, [tracks.length > 0]);

  function seekTo(pct: number) {
    const a = active();
    if (!a || !isFinite(a.duration) || a.duration <= 0) return;
    liveSyncRef.current = false;
    a.currentTime = pct * a.duration;
  }

  const playModeRef = useRef(playMode);
  useEffect(() => { playModeRef.current = playMode; }, [playMode]);

  useEffect(() => {
    const els = [audioRef.current, crossfadeRef.current].filter(
      (el): el is HTMLAudioElement => el !== null
    );
    if (!els.length) return;

    // Crossfades into whatever comes next in the sequence: the next DJ
    // segment, or — once the segment queue is spent — the next track.
    const advance = () => {
      if (crossfadingRef.current) return;
      const q = djQueueRef.current;
      if (q) {
        const nextSegIdx = q.idx + 1;
        if (nextSegIdx < q.segs.length) {
          crossfadeTo(q.segs[nextSegIdx], () => {
            djQueueRef.current = { ...q, idx: nextSegIdx };
          });
          return;
        }
        const nextTrack = tracks[q.nextIdx];
        if (!nextTrack) return;
        crossfadeTo(nextTrack.audioUrl, () => {
          djQueueRef.current = null;
          skipNextLoadRef.current = true;
          setTrackIdx(q.nextIdx);
        });
        return;
      }
      const n = tracks.length || 1;
      const mode = playModeRef.current;
      if (mode === "loop") return;
      const isRadio = sourceRef.current.key === "radio";
      let nextIdx = mode === "random" ? Math.floor(Math.random() * n) : trackIdxRef.current + 1;
      // A list started from a card ends where it ends; only the station wraps around.
      if (!isRadio && (n < 2 || (mode !== "random" && nextIdx >= n))) {
        active()?.pause();
        setPlaying(false);
        return;
      }
      nextIdx %= n;
      const nextTrack = tracks[nextIdx];
      if (!nextTrack) return;
      const preroll = djPrerollFor(nextTrack);
      if (preroll.length) {
        crossfadeTo(preroll[0], () => {
          djQueueRef.current = { segs: preroll, idx: 0, nextIdx };
        });
      } else {
        crossfadeTo(nextTrack.audioUrl, () => {
          skipNextLoadRef.current = true;
          setTrackIdx(nextIdx);
        });
      }
    };

    // Bound to BOTH elements permanently and filtered by "is this the
    // active one right now" — see the progress-display effect above for why
    // (avoids a stale-listener race across crossfade flips). A reused
    // "inactive" element naturally fires timeupdate/ended once it starts
    // playing the next queued segment; the filter keeps those from
    // triggering a second, premature advance.
    const onTimeUpdate = (e: Event) => {
      const a = e.currentTarget as HTMLAudioElement;
      if (a !== active()) return;
      if (crossfadingRef.current) return;
      if (!isFinite(a.duration) || a.duration <= 0) return;
      // A DJ announcer insert must never be faded out under its own last words:
      // the early look-ahead crossfade would swallow them. Let it finish; the
      // `ended` handler then advances to the track.
      const q = djQueueRef.current;
      if (q && q.segs[q.idx]?.includes("/dj-cache/")) return;
      if (a.duration - a.currentTime <= CROSSFADE_MS / 1000 + 0.05) advance();
    };

    // Fallback for loop mode (instant restart) and for clips shorter than
    // the crossfade window (lookahead never had a chance to fire).
    const onEnded = (e: Event) => {
      const a = e.currentTarget as HTMLAudioElement;
      if (a !== active()) return;
      if (crossfadingRef.current) return;
      if (playModeRef.current === "loop" && !djQueueRef.current) {
        a.currentTime = 0;
        a.play().catch(() => {});
        return;
      }
      advance();
    };

    // A track whose source 404s/403s (dead CDN link) never fires timeupdate
    // or ended — it just sits silently "playing" forever. Advance past it
    // like it ended, so the station keeps moving instead of going mute.
    const onError = (e: Event) => {
      const a = e.currentTarget as HTMLAudioElement;
      if (a !== active()) return;
      if (crossfadingRef.current) return;
      advance();
    };

    for (const el of els) {
      el.addEventListener("timeupdate", onTimeUpdate);
      el.addEventListener("ended", onEnded);
      el.addEventListener("error", onError);
    }
    return () => {
      for (const el of els) {
        el.removeEventListener("timeupdate", onTimeUpdate);
        el.removeEventListener("ended", onEnded);
        el.removeEventListener("error", onError);
      }
    };
  }, [tracks]);

  useEffect(() => {
    const el = songTitleRef.current;
    if (el) {
      const overflow = el.scrollWidth - (el.parentElement?.clientWidth ?? 0);
      if (overflow > 4) {
        el.style.setProperty("--sx", `-${overflow}px`);
        el.classList.add("scrolling");
      } else {
        el.style.removeProperty("--sx");
        el.classList.remove("scrolling");
      }
    }
  }, [trackIdx, tracks, expanded]);

  // Returning from the lock screen / another app while the main player is
  // playing: open the full-screen player instead of landing on the page.
  useEffect(() => {
    const onVisible = () => {
      const a = active();
      if (
        document.visibilityState === "visible" &&
        window.matchMedia("(max-width: 767px)").matches &&
        a &&
        !a.paused
      ) {
        setExpanded(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  function toggleLike(trackId: string) {
    const wasLiked = likedIds.has(trackId);
    const delta = wasLiked ? -1 : 1;
    setLikeCounts(prev => ({
      ...prev,
      [trackId]: Math.max(0, (prev[trackId] ?? 0) + delta),
    }));
    setLikedIds(prev => {
      const next = new Set(prev);
      if (wasLiked) next.delete(trackId); else next.add(trackId);
      try { localStorage.setItem("ts-liked-ids", JSON.stringify([...next])); } catch {}
      return next;
    });
    fetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId, delta }),
    }).catch(() => {});
  }

  const touchX = useRef<number | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40 || tracks.length < 2) return;
    liveSyncRef.current = false;
    setTrackIdx(i => {
      const len = tracks.length || 1;
      return dx < 0 ? (i + 1) % len : (i - 1 + len) % len;
    });
  }, [tracks.length]);

  function primeInactiveAudio() {
    if (primedRef.current) return;
    primedRef.current = true;
    const el = inactive();
    if (!el || el.getAttribute("src")) return;
    el.src = SILENT_WAV;
    el.play().then(() => {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }).catch(() => {});
  }

  function toggle() {
    const a = active();
    if (!a) return;
    if (playing) {
      setPlaying(false);
      a.pause();
    } else {
      primeInactiveAudio();
      setStarted(true);
      // Joining the live grid: re-sync to "what's on air right now" — pausing
      // the radio means missing a piece, like a real station.
      if (liveSyncRef.current && sourceRef.current.key === "radio" && playModeRef.current === "seq" && tracks.length > 1) {
        const pos = broadcastPosition(tracks);
        if (pos.idx !== trackIdx) {
          pendingSeekRef.current = pos.offset;
          setTrackIdx(pos.idx);
          setPlaying(true);
          return;
        }
        if (pos.offset > 2) applySeek(a, pos.offset);
      }
      a.play().catch(() => {});
      setPlaying(true);
    }
  }

  /* Starts a list from a card. Runs inside the tap so phones allow the sound,
     and swaps the source on the same <audio> element — no second player. */
  function playList(key: string, name: string, raw: RawTrack[], start = 0) {
    const list = mapTracks(raw);
    const a = active();
    if (!a || !list.length || crossfadingRef.current) return;
    primeInactiveAudio();
    liveSyncRef.current = false;
    djQueueRef.current = null;
    pendingSeekRef.current = null;
    cancelSeek();
    a.src = list[start].audioUrl;
    a.volume = 1;
    a.play().catch(() => {});
    skipNextLoadRef.current = true;
    const next = { key, name };
    sourceRef.current = next;
    setSource(next);
    trackIdxRef.current = start;
    setTracks(list);
    setTrackIdx(start);
    setPlaying(true);
    setStarted(true);
  }

  function backToRadio() {
    const list = radioTracksRef.current;
    const a = active();
    if (!a || !list.length || crossfadingRef.current) return;
    const pos = broadcastPosition(list);
    liveSyncRef.current = true;
    djQueueRef.current = null;
    pendingSeekRef.current = null;
    cancelSeek();
    a.src = list[pos.idx].audioUrl;
    a.volume = 1;
    if (pos.offset > 2) applySeek(a, pos.offset);
    a.play().catch(() => {});
    skipNextLoadRef.current = true;
    sourceRef.current = RADIO;
    setSource(RADIO);
    trackIdxRef.current = pos.idx;
    setTracks(list);
    setTrackIdx(pos.idx);
    setPlaying(true);
  }

  /* A shared link (/t/<id> → /?t=<id>) opens the song ready to play in the
     list it lives in. Browsers won't start sound by themselves, so it waits
     for a tap. */
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (deepLinkDone.current || !tracks.length) return;
    deepLinkDone.current = true;
    const id = new URLSearchParams(window.location.search).get("t");
    if (!id) return;
    window.history.replaceState(null, "", window.location.pathname);
    fetch(`/api/track/${encodeURIComponent(id)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((f: { list: RawTrack[]; index: number; source: { key: string; name: string } } | null) => {
        if (!f) return;
        liveSyncRef.current = false;
        djQueueRef.current = null;
        pendingSeekRef.current = null;
        if (f.source.key === "radio") {
          const i = radioTracksRef.current.findIndex(t => t.id === id);
          if (i >= 0) setTrackIdx(i);
        } else {
          sourceRef.current = f.source;
          setSource(f.source);
          trackIdxRef.current = f.index;
          setTracks(mapTracks(f.list));
          setTrackIdx(f.index);
        }
        window.scrollTo({ top: 0 });
      })
      .catch(() => {});
  }, [tracks.length]);

  function skip(dir: 1 | -1) {
    const len = tracks.length;
    if (len < 2) return;
    selectTrack(i => (i + dir + len) % len);
  }

  function openPlayer() {
    if (window.matchMedia("(max-width: 767px)").matches) setExpanded(true);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // The floating bar only shows while the big player is scrolled out of view.
  // Measured on scroll/resize rather than observed, so it can't go stale.
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const el = heroPlayerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setHeroVisible(r.bottom > 0 && r.top < window.innerHeight);
    };
    const onMove = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [tracks.length > 0]);

  /* Share the current song: the phone's share sheet when there is one,
     otherwise copy the link and flash a checkmark on the button. */
  const [shared, setShared] = useState(false);
  async function shareTrack(t: Track) {
    const link = `${window.location.origin}/t/${t.id}`;
    // Link only: a title/text next to it ends up pasted in front of the URL in chats.
    const data = { url: link };
    try {
      if (navigator.share) { await navigator.share(data); return; }
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      window.prompt("Copy the link", link);
    }
  }

  /* Dice in the player: plays a random song from the whole library. The pick
     is fetched ahead of time so the tap itself can start the sound — phones
     refuse to start audio after a network wait. */
  const luckyRef = useRef<SearchHit | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceFace, setDiceFace] = useState(5);
  const prefetchLucky = useCallback(() => {
    fetch("/api/search?random=1")
      .then(r => r.json())
      .then(d => { if (d?.hits?.[0]) luckyRef.current = d.hits[0]; })
      .catch(() => {});
  }, []);
  useEffect(() => { prefetchLucky(); }, [prefetchLucky]);

  function rollRandom() {
    if (diceRolling) return;
    setDiceRolling(true);
    const spin = setInterval(() => setDiceFace(1 + Math.floor(Math.random() * 6)), 110);
    const play = (h: SearchHit) => {
      const fresh = h.source.key.startsWith("fresh-");
      playList(fresh ? h.source.key : `s-${h.id}`, fresh ? "Fresh" : "Random", [h], 0);
    };
    const hit = luckyRef.current;
    luckyRef.current = null;
    const done = () => {
      clearInterval(spin);
      setDiceFace(1 + Math.floor(Math.random() * 6));
      setDiceRolling(false);
      prefetchLucky();
    };
    if (hit) {
      play(hit);
      setTimeout(done, 900);
    } else {
      fetch("/api/search?random=1")
        .then(r => r.json())
        .then(d => { if (d?.hits?.[0]) play(d.hits[0]); })
        .catch(() => {})
        .finally(() => setTimeout(done, 600));
    }
  }

  const diceBtn = (cls: string) => (
    <button
      className={`${cls} player__dice${diceRolling ? " is-rolling" : ""}`}
      onClick={rollRandom}
      aria-label="Play a random track"
      title="Random track"
    >
      <DiceIcon face={diceFace} size={20} />
    </button>
  );

  const playerApi: PlayerApi = {
    sourceKey: source.key,
    playing,
    currId: tracks[trackIdx]?.id,
    playList,
    toggle,
    skip,
    likedIds,
    likeCounts,
    toggleLike,
    openPlayer,
  };

  const currCover = useCroppedCover(tracks[trackIdx]?.imageUrl);
  const auraColors = useCoverColors(tracks[trackIdx]?.imageUrl);
  const comments = useComments(tracks[trackIdx]?.id);
  const nextCover = useCroppedCover(tracks.length ? tracks[(trackIdx + 1) % tracks.length]?.imageUrl : undefined);
  const currMeta = useTrackMeta(tracks[trackIdx]?.id);
  const nextMeta = useTrackMeta(tracks.length ? tracks[(trackIdx + 1) % tracks.length]?.id : undefined);

  const n = tracks.length;
  const prev = n > 0 ? tracks[(trackIdx - 1 + n) % n] : null;
  const curr = n > 0 ? tracks[trackIdx] : null;
  const next = n > 0 ? tracks[(trackIdx + 1) % n] : null;
  const likeCount = curr ? (likeCounts[curr.id] ?? curr.likes) : 0;
  const genre = curr ? ((currMeta && genreLabel(currMeta.tags)) || curr.genre) : "";

  // Narrowed aliases — only non-null when tracks are loaded (curr guards all player JSX)
  const currT = curr!;
  const prevT = prev!;
  const nextT = next!;

  const barVisible = !!curr && started && !expanded && !heroVisible;

  return (
    <PlayerCtx.Provider value={playerApi}>
    <div
      className="min-h-screen flex flex-col gap-1.5 p-1.5"
      style={{ background: "var(--ink)", paddingBottom: barVisible ? "calc(5.5rem + env(safe-area-inset-bottom))" : undefined }}
    >
      {/* ── Mobile full-screen player (position:fixed at root to escape overflow:hidden) ── */}
      {expanded && curr && (
        <div className="player-fs" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="player-fs__topbar">
            {source.key !== "radio" && (
              <button className="back-to-radio menu-type" onClick={backToRadio} aria-label="Back to radio"><BackIcon /> Back</button>
            )}
            <button
              className="player-fs__close"
              onClick={() => setExpanded(false)}
              aria-label="Collapse player"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="player-fs__artwork">
            <img src={currCover || curr.imageUrl} alt={curr.title} className="player-fs__img" />
          </div>
          <div className="player-fs__body">
            <p className="player-fs__song">
              {curr.title}
              {playing && <span className="now-shelf__dot ml-2 inline-block" />}
            </p>
            <div className="player-card__meta">
              {genre && <span className="chip" style={{ background: "var(--yellow)" }}>{genre}</span>}
              {currMeta && <ArtistChip meta={currMeta} />}
            </div>
            <div className="player__controls" style={{ justifyContent: "center" }}>
              <button onClick={() => selectTrack((trackIdx - 1 + n) % n)} className="player__nav" disabled={n < 2} aria-label={`Previous: ${prevT.title}`}>‹</button>
              <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="player__play">{playing ? "❚❚" : "▶"}</button>
              <button onClick={() => selectTrack((trackIdx + 1) % n)} className="player__nav" disabled={n < 2} aria-label={`Next: ${nextT.title}`}>›</button>
              <button onClick={() => toggleLike(curr.id)} className={`player__like${likedIds.has(curr.id) ? " is-liked" : ""}`} aria-label={likedIds.has(curr.id) ? "Unlike" : "Like"}>{likedIds.has(curr.id) ? "♥" : "♡"} {likeCount}</button>
              <button onClick={() => shareTrack(curr)} className="player__nav player__share" aria-label="Share this song" title="Share">{shared ? "✓" : <ShareIcon />}</button>
              <CommentsButton c={comments} />
            </div>
            <Scrubber progress={progress} seekTo={seekTo} />
            <div className="player__scrubber-time">
              <span>{elapsed || "0:00"}</span>
              <span>{remaining || curr.duration}</span>
            </div>
            <div className="player__modes">
              {(["seq", "loop", "random"] as const).map(m => (
                <button key={m} onClick={() => setPlayMode(m)} className={`player__mode${playMode === m ? " active" : ""}`} title={m === "seq" ? "Play all" : m === "loop" ? "Loop track" : "Shuffle"}>
                  {m === "seq" ? "▶▶" : m === "loop" ? "↺" : "⇌"}
                </button>
              ))}
              {diceBtn("player__mode")}
            </div>
            {n > 1 && (
            <button className="player-card__next" style={{ width: "100%" }} onClick={() => selectTrack((trackIdx + 1) % n)}>
              <span className="player-card__next-label menu-type">next up</span>
              <img src={nextCover || nextT.imageUrl} alt={nextT.title} className="player-card__next-img" />
              <span className="player-card__next-title">
                <span className="player__song-text">{nextT.title}</span>
                <span className="player-card__next-author">{nextMeta?.artist || AUTHOR}</span>
              </span>
              <span className="font-black opacity-40">›</span>
            </button>
            )}
            <CommentsPanel c={comments} />
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────── */}
      <header
        className="rounded-xl relative flex items-center justify-between px-4 md:px-6 py-1.5 md:py-2"
        style={{ background: "var(--yellow)" }}
      >
        <a href="#" className="flex items-center shrink-0 shine-wrap">
          <img src="/tracksnack-long.png" alt="TrackSnack" className="h-14 md:h-20 w-auto" />
        </a>
        <nav className="hidden md:flex items-center gap-6 menu-type text-xl absolute left-1/2 -translate-x-1/2">
          <a href="#menu" className="hover:text-red">Menu</a>
          <a href="#fresh" className="hover:text-red">Fresh</a>
          <a href="#how" className="hover:text-red">How it works</a>
          <a href="#chef" className="hover:text-red">The chef</a>
        </nav>
        <a href="#order-track" className="pill pill-red pill-sm text-sm py-2 px-4">Order a track</a>
      </header>

      {/* ── Hero: roadside billboard at dusk ───── */}
      <section
        className="rounded-xl overflow-hidden px-4 md:px-8 pt-10 md:pt-16 pb-0"
        style={{ background: "linear-gradient(180deg, var(--dusk-1) 0%, var(--dusk-2) 70%, #23201E 100%)" }}
      >
        <div className="w-full max-w-3xl mx-auto relative fade-up">
          <div className="billboard bulbs px-6 md:px-14 pt-10 pb-9 md:pt-12 md:pb-11 text-center">
            <span
              className="neon absolute top-5 right-6 text-sm md:text-base"
              style={{ transform: "rotate(3deg)" }}
            >
              OPEN 24/7
            </span>
            <audio ref={audioRef} preload="none" />
            <audio ref={crossfadeRef} preload="none" />
            <div className="relative aspect-square w-full max-w-80 md:max-w-[26rem] mx-auto mb-6">
              <div className="absolute inset-[6%] rounded-full overflow-hidden">
                <img
                  src="/vinyl.svg"
                  alt=""
                  aria-hidden
                  className={`vinyl-disc w-full h-full object-cover${playing ? "" : " paused"}`}
                />
              </div>
              <img
                src="/tracksnack-hero-2.avif"
                alt="TrackSnack — fresh songs, cooked live."
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>

            {/* Player */}
            <div ref={heroPlayerRef}>
            {curr && source.key !== "radio" && (
              <button className="back-to-radio menu-type" onClick={backToRadio} aria-label="Back to radio">
                <BackIcon /> Back
              </button>
            )}
            {curr && (
              <div className="aura-wrap mx-auto mb-6">
                {(["", " aura--rim"] as const).map(kind => (
                  <div
                    key={kind}
                    className={`aura${kind}${playing ? " is-playing" : ""}`}
                    aria-hidden
                    style={{ "--a1": auraColors[0], "--a2": auraColors[1], "--a3": auraColors[2] } as React.CSSProperties}
                  />
                ))}
            {!expanded ? (
              <div className="player" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                <button
                  className="player__cover overflow-hidden"
                  onClick={() => setExpanded(true)}
                  aria-label="Show track details"
                >
                  <img src={currCover || curr.imageUrl} alt={curr.title} className="w-full h-full object-cover" />
                </button>
                <button className="player__info text-left" onClick={() => setExpanded(true)}>
                  <p className="player__song">
                    <span ref={songTitleRef} className="player__song-text">{curr.title}</span>
                    {playing && <span className="now-shelf__dot ml-2 inline-block" />}
                  </p>
                  <p className="player__author truncate">{currMeta?.artist || AUTHOR}</p>
                </button>
                <div className="player__controls">
                  <button
                    onClick={() => selectTrack((trackIdx - 1 + n) % n)}
                    className="player__nav"
                    disabled={n < 2}
                    aria-label={`Previous: ${prevT.title}`}
                  >
                    ‹
                  </button>
                  <button
                    onClick={toggle}
                    aria-label={playing ? "Pause" : "Play"}
                    className="player__play"
                  >
                    {playing ? "❚❚" : "▶"}
                  </button>
                  <button
                    onClick={() => selectTrack((trackIdx + 1) % n)}
                    className="player__nav"
                    disabled={n < 2}
                    aria-label={`Next: ${nextT.title}`}
                  >
                    ›
                  </button>
                  <button onClick={() => shareTrack(curr)} className="player__nav player__share" aria-label="Share this song" title="Share">{shared ? "✓" : <ShareIcon />}</button>
                  {diceBtn("player__nav")}
                </div>
              </div>
            ) : (
              <div className="player-card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                  <button
                    className="player-card__close"
                    onClick={() => setExpanded(false)}
                    aria-label="Collapse player"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                      <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <div className="player-card__cover">
                    <img src={currCover || curr.imageUrl} alt={curr.title} />
                  </div>
                  <p className="player-card__song">
                    {curr.title}
                    {playing && <span className="now-shelf__dot ml-2 inline-block" />}
                  </p>
                  <div className="player-card__meta">
                    {genre && <span className="chip" style={{ background: "var(--yellow)" }}>{genre}</span>}
                    {currMeta && <ArtistChip meta={currMeta} />}
                  </div>
                  <div className="player__controls justify-center">
                    <button
                      onClick={() => selectTrack((trackIdx - 1 + n) % n)}
                      className="player__nav"
                      disabled={n < 2}
                      aria-label={`Previous: ${prevT.title}`}
                    >
                      ‹
                    </button>
                    <button
                      onClick={toggle}
                      aria-label={playing ? "Pause" : "Play"}
                      className="player__play"
                    >
                      {playing ? "❚❚" : "▶"}
                    </button>
                    <button
                      onClick={() => selectTrack((trackIdx + 1) % n)}
                      className="player__nav"
                      disabled={n < 2}
                      aria-label={`Next: ${nextT.title}`}
                    >
                      ›
                    </button>
                    <button
                      onClick={() => toggleLike(curr.id)}
                      className={`player__like${likedIds.has(curr.id) ? " is-liked" : ""}`}
                      aria-label={likedIds.has(curr.id) ? "Unlike" : "Like"}
                    >
                      {likedIds.has(curr.id) ? "♥" : "♡"} {likeCount}
                    </button>
                    <button onClick={() => shareTrack(curr)} className="player__nav player__share" aria-label="Share this song" title="Share">{shared ? "✓" : <ShareIcon />}</button>
              <CommentsButton c={comments} />
                  </div>
                  <Scrubber progress={progress} seekTo={seekTo} />
                  <div className="player__scrubber-time">
                    <span>{elapsed || "0:00"}</span>
                    <span>{remaining || curr.duration}</span>
                  </div>
                  <div className="player__modes">
                    {(["seq", "loop", "random"] as const).map(m => (
                      <button key={m} onClick={() => setPlayMode(m)} className={`player__mode${playMode === m ? " active" : ""}`} title={m === "seq" ? "Play all" : m === "loop" ? "Loop track" : "Shuffle"}>
                        {m === "seq" ? "▶▶" : m === "loop" ? "↺" : "⇌"}
                      </button>
                    ))}
              {diceBtn("player__mode")}
                  </div>
                  {n > 1 && (
                  <button
                    className="player-card__next"
                    onClick={() => selectTrack((trackIdx + 1) % n)}
                  >
                    <span className="player-card__next-label menu-type">next up</span>
                    <img src={nextCover || nextT.imageUrl} alt={nextT.title} className="player-card__next-img" />
                    <span className="player-card__next-title">
                      <span ref={nextTitleRef} className="player__song-text">{nextT.title}</span>
                      <span className="player-card__next-author">{nextMeta?.artist || AUTHOR}</span>
                    </span>
                    <span className="font-black opacity-40">›</span>
                  </button>
                  )}
                  <CommentsPanel c={comments} />
                </div>
            )}
              </div>
            )}
            </div>

            <h1 className="display text-2xl md:text-3xl mb-2" style={{ color: "var(--brown)" }}>
              Fresh Songs, Cooked Live.
            </h1>
            <p className="font-semibold text-sm md:text-base max-w-md mx-auto mb-7 opacity-80">
              Order a song. Watch us cook it. Hear it live.
            </p>
            <div className="flex items-center justify-center gap-3 mb-5">
              <a href="#order-track" className="pill pill-yellow text-base">Order a song</a>
              <a
                href={streamUrl || "#"}
                target={streamUrl ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="pill pill-paper text-base"
              >Listen live</a>
            </div>
            <p className="hero__kitchen-status">
              <span className="hero__kitchen-dot" />
              Kitchen opens tonight · Meanwhile, listen to today&apos;s fresh tracks
            </p>
          </div>
          <div className="legs" aria-hidden>
            <span /><span />
          </div>

        </div>
      </section>

      <Road />

      {/* ── Ticker ─────────────────────────────── */}
      <div className="rounded-xl py-3 marquee" style={{ background: "var(--red)" }}>
        <div className="marquee__track menu-type text-xl md:text-2xl" style={{ color: "var(--cream-deep)" }}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="marquee__item">
              {t} <span aria-hidden>✦</span>
            </span>
          ))}
        </div>
      </div>

      <SearchSection />

      {/* ── Menu ───────────────────────────────── */}
      <section id="menu" className="rounded-xl px-5 md:px-12 py-12 md:py-16" style={{ background: "var(--cream)" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="display text-3xl md:text-5xl mb-2 text-center">Today&apos;s specials</h2>
          <p className="font-semibold opacity-70 mb-8 text-center">Thematic playlists from the kitchen — each one plays right here.</p>
          {playlists.length > 0 ? (
            <div className="playlist-row">
              {playlists.map(pl => (
                <PlaylistMiniPlayer
                  key={pl.id}
                  playlistId={pl.id}
                  coverUrl={pl.cover_url}
                  name={pl.name}
                  description={pl.description}
                  accent={pl.accent}
                />
              ))}
            </div>
          ) : (
            <p className="font-medium opacity-40">The menu is being written…</p>
          )}
        </div>
      </section>

      <div className="checker" aria-hidden />

      {/* ── Fresh out of the kitchen ───────────── */}
      <section id="fresh" className="rounded-xl px-5 md:px-12 py-12 md:py-16" style={{ background: "var(--paper)" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="display text-3xl md:text-5xl mb-2 text-center">Fresh out of the kitchen</h2>
          <p className="font-semibold opacity-70 mb-8 text-center">
            Hot off the stove — tap to taste.
          </p>
          {freshTracks.length > 0 ? (
            <div className="flex flex-col items-center gap-3 md:gap-4">
              {freshTracks.slice(freshPage * FRESH_PAGE, (freshPage + 1) * FRESH_PAGE).map((t) => (
                <PlaylistMiniPlayer
                  key={t.id}
                  playlistId={`fresh-${t.id}`}
                  coverUrl={t.image_url}
                  name="Fresh"
                  initialTracks={[t]}
                  compact
                />
              ))}
              <Pager
                page={freshPage}
                pages={Math.ceil(freshTracks.length / FRESH_PAGE)}
                onPage={p => {
                  setFreshPage(p);
                  document.getElementById("fresh")?.scrollIntoView({ block: "start", behavior: "smooth" });
                }}
              />
            </div>
          ) : (
            <p className="font-medium opacity-40">Nothing fresh today — check back later.</p>
          )}
        </div>
      </section>

      <Road />

      {/* ── How it works ───────────────────────── */}
      <section id="how" className="rounded-xl px-5 md:px-12 py-12 md:py-16" style={{ background: "var(--mustard)" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="display text-3xl md:text-5xl mb-8">How the kitchen works</h2>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="panel">
                <span
                  className="display inline-flex items-center justify-center w-12 h-12 rounded-full border-2 text-xl mb-3"
                  style={{ borderColor: "var(--ink)", background: "var(--red)", color: "var(--paper)" }}
                >
                  {s.n}
                </span>
                <h3 className="display text-lg md:text-xl mb-2">{s.title}</h3>
                <p className="font-medium opacity-75 text-sm md:text-base">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The chef ───────────────────────────── */}
      <section
        id="chef"
        className="rounded-xl px-5 md:px-12 py-12 md:py-16 text-center"
        style={{ background: "var(--ink)", color: "var(--cream)" }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="neon text-lg md:text-xl mb-4">MEET THE CHEF</p>
          <h2 className="display text-3xl md:text-5xl mb-6" style={{ color: "var(--cream)" }}>
            44,000 portions served
          </h2>
          <div className="flex flex-wrap justify-center gap-3 mb-8 menu-type text-lg">
            <span className="chip" style={{ background: "var(--yellow)", color: "var(--ink)" }}>382 tracks on the menu</span>
            <span className="chip" style={{ background: "var(--mint)", color: "var(--ink)" }}>350 regulars</span>
            <span className="chip" style={{ background: "var(--pink)", color: "var(--ink)" }}>cooking since 2024</span>
          </div>
          <a
            href="https://suno.com/@miguel2020"
            target="_blank"
            rel="noopener noreferrer"
            className="pill pill-paper text-base"
          >
            Visit the pantry on Suno →
          </a>
        </div>
      </section>

      {/* ── Tip the chef (donations via Tribute) ── */}
      <section
        id="tips"
        className="rounded-xl px-5 md:px-12 py-12 md:py-16 text-center"
        style={{ background: "var(--mustard)" }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-5xl mb-4">🫙</p>
          <h2 className="display text-3xl md:text-5xl mb-3">Tip jar</h2>
          <p className="font-semibold opacity-80 max-w-md mx-auto mb-8">
            The kitchen runs on love and tips. If a track made your day,
            drop something in the jar — every bit keeps the oven hot.
          </p>
          <div className="flex flex-col min-[480px]:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setTipOpen(true)}
              className="pill pill-red text-base"
              style={{ cursor: "pointer" }}
            >
              Tip with card
            </button>
            <a
              href="https://t.me/tribute/app?startapp=dNkg"
              target="_blank"
              rel="noopener noreferrer"
              className="pill text-base"
              style={{ background: "var(--paper)", color: "var(--ink)", boxShadow: "0 6px 0 0 rgba(22,18,16,0.25)" }}
            >
              Tip via Telegram
            </a>
          </div>
          {tipOpen && (
            <div className="tip-modal" onClick={() => setTipOpen(false)}>
              <div className="tip-modal__box" onClick={e => e.stopPropagation()}>
                <button className="tip-modal__close" onClick={() => setTipOpen(false)} aria-label="Close">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <iframe src="https://web.tribute.tg/d/Nkg" className="tip-modal__frame" title="Tip the chef" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Order a track ────────────────────────── */}
      <OrderForm />

      {/* ── Order / footer ─────────────────────── */}
      <footer
        id="order"
        className="rounded-xl px-5 md:px-12 py-12 md:py-16 text-center"
        style={{ background: "var(--red)", color: "var(--cream-deep)" }}
      >
        <h2 className="display text-3xl md:text-5xl mb-3" style={{ color: "var(--cream-deep)" }}>
          Hungry for a track?
        </h2>
        <p className="font-semibold opacity-90 max-w-md mx-auto mb-7">
          Orders open during live shows. Join the counter on Telegram — the
          kitchen bell rings when we go on air.
        </p>
        <div className="flex flex-col min-[480px]:flex-row items-center justify-center gap-3 mb-10">
          <a
            href="https://telegram.dog/tracksnack"
            target="_blank"
            rel="noopener noreferrer"
            className="pill pill-yellow text-base"
          >
            Join on Telegram
          </a>
          <a href="#" className="pill pill-paper text-base">Watch the stream</a>
        </div>
        <p className="menu-type text-sm opacity-70">
          TrackSnack ✦ Fresh songs, cooked live ✦ Route 66, the internet
        </p>
      </footer>

      {/* ── Floating player bar: one shared player, always in reach ── */}
      {barVisible && curr && (
        <div
          className={`float-wrap${playing ? " is-playing" : ""}`}
          style={{ "--a1": auraColors[0], "--a2": auraColors[1], "--a3": auraColors[2] } as React.CSSProperties}
        >
          {/* light behind the bar: a thin neon rim plus bars that sway like a spectrum
              (a look only — it is not analysing the sound) */}
          <div className={`aura aura--rim${playing ? " is-playing" : ""}`} aria-hidden />
          <div className="float-spectrum" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => <i key={i} />)}
          </div>
        <div className="float-bar" role="region" aria-label="Now playing">
          <button className="float-bar__main" onClick={openPlayer} aria-label="Open player">
            <img src={currCover || curr.imageUrl} alt="" className="float-bar__cover" />
            <span className="float-bar__text">
              <Marquee className="float-bar__title" text={curr.title} />
              <Marquee
                className="float-bar__sub"
                text={source.key === "radio" ? "On air · TrackSnack Radio" : `${source.name}${curr.orderedFor ? ` — for ${curr.orderedFor}` : ""}`}
              />
            </span>
          </button>
          <button
            className={`player__like float-bar__like${likedIds.has(curr.id) ? " is-liked" : ""}`}
            onClick={() => toggleLike(curr.id)}
            aria-label={likedIds.has(curr.id) ? "Unlike" : "Like"}
          >
            {likedIds.has(curr.id) ? "♥" : "♡"}
          </button>
          <button onClick={() => shareTrack(curr)} className="player__nav player__share" aria-label="Share this song" title="Share">{shared ? "✓" : <ShareIcon />}</button>
          <button className="player__play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
            {playing ? "❚❚" : "▶"}
          </button>
        </div>
        </div>
      )}
    </div>
    </PlayerCtx.Provider>
  );
}
