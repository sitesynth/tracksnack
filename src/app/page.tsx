"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";

type Track = {
  id: string;
  title: string;
  imageUrl: string;
  audioUrl: string;
  duration: string;
  genre: string;
  sunoUrl: string;
  likes: number;
};

type RawTrack = {
  id: string;
  title: string;
  audio_url: string;
  image_url: string;
  duration: number;
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

function TrackComments({ trackId }: { trackId: string }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    loaded.current = false;
    fetch(`/api/comments/${trackId}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) { setComments(data); setCount(data.length); }
      loaded.current = true;
    }).catch(() => {});
  }, [trackId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !text.trim() || sending) return;
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

  const ago = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (d < 1) return "just now";
    if (d < 60) return `${d}m`;
    if (d < 1440) return `${Math.floor(d / 60)}h`;
    return `${Math.floor(d / 1440)}d`;
  };

  return (
    <div style={{ width: "100%" }}>
      <button
        onClick={() => setOpen(!open)}
        className="chip"
        style={{ background: "var(--cream-deep)", cursor: "pointer", border: "none", fontFamily: "inherit" }}
      >
        💬 {count}
      </button>
      {open && (
        <div className="comments-panel">
          <form onSubmit={submit} className="comments-form">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="comments-input"
            />
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <input
                type="text"
                placeholder="Say something…"
                value={text}
                onChange={e => setText(e.target.value)}
                required
                className="comments-input"
                style={{ flex: 1 }}
              />
              <button type="submit" disabled={sending} className="comments-send">
                {sending ? "…" : "→"}
              </button>
            </div>
          </form>
          {comments.length === 0 && <p className="comments-empty">No comments yet — be the first!</p>}
          {comments.map(c => (
            <div key={c.id} className="comments-item">
              <span className="comments-name">{c.name}</span>
              <span className="comments-ago">{ago(c.created)}</span>
              <p className="comments-text">{c.text}</p>
            </div>
          ))}
        </div>
      )}
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

function FreshTrackCard({ track, onBeforePlay }: { track: Track; onBeforePlay: (a: HTMLAudioElement) => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const croppedCover = useCroppedCover(track.imageUrl);
  const meta = useTrackMeta(track.id);
  const genre = meta ? genreLabel(meta.tags) : track.genre;

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      onBeforePlay(a);
      a.src = track.audioUrl;
      a.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing, track.audioUrl, onBeforePlay]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("pause", onPause); a.removeEventListener("ended", onEnd); };
  }, []);

  return (
    <>
      {expanded && (
        <div className="player-fs" style={{ display: "flex" }}>
          <div className="player-fs__topbar">
            <span className="player-fs__playlist-name">Fresh</span>
            <button className="player-fs__close" onClick={() => setExpanded(false)} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="player-fs__artwork">
            <img src={croppedCover || track.imageUrl} alt={track.title} className="player-fs__img" />
          </div>
          <div className="player-fs__body">
            <p className="player-fs__song">{track.title}{playing && <span className="now-shelf__dot ml-2 inline-block" />}</p>
            {(genre || meta) && (
              <div className="player-card__meta">
                {genre && <span className="chip" style={{ background: "var(--yellow)" }}>{genre}</span>}
                {meta && <ArtistChip meta={meta} />}
                </div>
            )}
            <div className="player__controls" style={{ justifyContent: "center" }}>
              <button onClick={toggle} className="player__play" aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
            </div>
            <TrackComments trackId={track.id} />
          </div>
        </div>
      )}
      <div className="panel flex items-center gap-4 !p-4">
        <audio ref={audioRef} preload="none" />
        <button
          onClick={() => setExpanded(true)}
          className="w-14 h-14 rounded-xl border-2 shrink-0 overflow-hidden"
          style={{ borderColor: "var(--ink)", padding: 0, background: "none", cursor: "pointer", border: "2px solid var(--ink)" }}
        >
          <img src={croppedCover || track.imageUrl} alt={track.title} className="w-full h-full object-cover block" />
        </button>
        <div className="min-w-0">
          <p className="display text-base truncate">{track.title}</p>
          <p className="menu-type text-sm opacity-60">{genre}</p>
        </div>
        <button
          aria-label={playing ? "Pause" : `Play ${track.title}`}
          onClick={toggle}
          className="player__play ml-auto shrink-0"
        >
          {playing ? "❚❚" : "▶"}
        </button>
      </div>
    </>
  );
}

function PlaylistMiniPlayer({
  playlistId,
  coverUrl,
  name,
  description,
  accent,
  onBeforePlay,
}: {
  playlistId: string;
  coverUrl: string;
  name: string;
  description?: string;
  accent?: string;
  onBeforePlay: (audio: HTMLAudioElement) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [tracks, setTracks] = useState<RawTrack[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState("");
  const [remaining, setRemaining] = useState("");
  const [playMode, setPlayMode] = useState<"seq" | "loop" | "random">("seq");
  const shouldPlayRef = useRef(false);
  const tracksLenRef = useRef(0);
  const playModeRef = useRef(playMode);
  useEffect(() => { playModeRef.current = playMode; }, [playMode]);

  useEffect(() => {
    fetch(`/api/custom-playlists/${playlistId}/tracks`)
      .then(r => r.json())
      .then(d => {
        const arr = Array.isArray(d) ? d : [];
        setTracks(arr);
        tracksLenRef.current = arr.length;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/likes").then(r => r.json()).then(setLikeCounts).catch(() => {});
    try {
      const raw = localStorage.getItem("ts-liked-ids");
      if (raw) setLikedIds(new Set(JSON.parse(raw)));
    } catch {}
  }, [playlistId]);

  function toggleLike(trackId: string) {
    const wasLiked = likedIds.has(trackId);
    const delta = wasLiked ? -1 : 1;
    setLikeCounts(prev => ({ ...prev, [trackId]: Math.max(0, (prev[trackId] ?? 0) + delta) }));
    setLikedIds(prev => {
      const next = new Set(prev);
      wasLiked ? next.delete(trackId) : next.add(trackId);
      try { localStorage.setItem("ts-liked-ids", JSON.stringify([...next])); } catch {}
      return next;
    });
    fetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId, delta }),
    }).catch(() => {});
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      const len = Math.max(1, tracksLenRef.current);
      if (playModeRef.current === "loop") {
        a.currentTime = 0;
        a.play().catch(() => {});
      } else if (playModeRef.current === "random") {
        setIdx(i => (len < 2 ? i : (i + 1 + Math.floor(Math.random() * (len - 1))) % len));
      } else {
        setIdx(i => (i + 1) % len);
      }
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !tracks.length) return;
    a.src = tracks[idx]?.audio_url ?? "";
    if (shouldPlayRef.current) a.play().catch(() => {});
  }, [idx, tracks]);

  useEffect(() => {
    if (!playing || !("mediaSession" in navigator)) return;
    const track = tracks[idx];
    if (!track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: name,
      artwork: track.image_url ? [{ src: track.image_url, sizes: "512x512" }] : [],
    });
    navigator.mediaSession.playbackState = "playing";
  }, [playing, idx, tracks, name]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || playing) return;
    navigator.mediaSession.playbackState = "paused";
  }, [playing]);

  // Returning from the lock screen / another app while this mini-player is
  // playing: open its full-screen view instead of landing on the page.
  useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        window.matchMedia("(max-width: 767px)").matches &&
        audioRef.current &&
        !audioRef.current.paused
      ) {
        setExpanded(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const fmt = (s: number) =>
      `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const onTime = () => {
      if (isNaN(a.duration) || a.duration <= 0) return;
      setProgress(a.currentTime / a.duration);
      setElapsed(fmt(a.currentTime));
      setRemaining(fmt(Math.max(0, a.duration - a.currentTime)));
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onTime);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onTime);
    };
  }, [tracks.length > 0]);

  function seekTo(pct: number) {
    const a = audioRef.current;
    if (!a || isNaN(a.duration)) return;
    a.currentTime = pct * a.duration;
  }

  function toggle() {
    const a = audioRef.current;
    if (!a || !tracks.length) return;
    if (playing) {
      shouldPlayRef.current = false;
      a.pause();
    } else {
      onBeforePlay(a);
      shouldPlayRef.current = true;
      a.play().catch(() => {});
    }
  }

  function skip(dir: 1 | -1) {
    const n = tracks.length;
    if (n < 2) return;
    shouldPlayRef.current = playing;
    setIdx(i => (i + dir + n) % n);
  }

  const n = tracks.length;
  const curr = tracks[idx];
  const nextTrack = n > 1 ? tracks[(idx + 1) % n] : undefined;
  const displayCover = curr?.image_url || coverUrl || "";
  const croppedCover = useCroppedCover(displayCover || undefined);
  const croppedNext = useCroppedCover(nextTrack?.image_url || undefined);
  const currMeta = useTrackMeta(curr?.id);
  const nextMeta = useTrackMeta(nextTrack?.id);
  const genre = currMeta ? genreLabel(currMeta.tags) : "";

  const miniCard = (
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
              <button className="playlist-mini__expand" onClick={() => setExpanded(true)} aria-label="Expand player">
                <img src={croppedCover || displayCover} alt={name} className="playlist-mini__thumb" />
              </button>
            )
            : <div className="playlist-mini__thumb playlist-mini__thumb--empty" aria-hidden />
          }
          <div className="playlist-mini__info">
            <p className="playlist-mini__label">Now serving</p>
            <p className="playlist-mini__track">
              {loading ? "…" : curr?.title || "—"}
              {playing && <span className="now-shelf__dot ml-2 inline-block" />}
            </p>
          </div>
        </div>
        <div className="playlist-mini__controls">
          <button className="player__nav" onClick={() => skip(-1)} disabled={n < 2} aria-label="Previous">‹</button>
          <button className="player__play" onClick={toggle} disabled={n === 0 || loading} aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
          <button className="player__nav" onClick={() => skip(1)} disabled={n < 2} aria-label="Next">›</button>
          {!loading && n > 0 && (
            <span className="playlist-mini__count">{idx + 1}/{n}</span>
          )}
          {curr && (
            <button
              className={`playlist-mini__like${likedIds.has(curr.id) ? " is-liked" : ""}`}
              onClick={() => toggleLike(curr.id)}
              aria-label={likedIds.has(curr.id) ? "Unlike" : "Like"}
            >
              {likedIds.has(curr.id) ? "♥" : "♡"} {likeCounts[curr.id] ?? 0}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <audio ref={audioRef} preload="none" />

      {/* Mobile fullscreen player */}
      {expanded && !isDesktop && curr && (
        <div className="player-fs" style={{ display: "flex" }}>
          <div className="player-fs__topbar">
            <span className="player-fs__playlist-name">{name}</span>
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
            {displayCover && <img src={croppedCover || displayCover} alt={curr.title} className="player-fs__img" />}
          </div>
          <div className="player-fs__body">
            <p className="player-fs__song">
              {curr.title}
              {playing && <span className="now-shelf__dot ml-2 inline-block" />}
            </p>
            <p className="player-fs__author" style={{ color: "var(--ink)", textDecoration: "none", opacity: 0.55 }}>
              {name}
            </p>
            {(genre || currMeta) && (
              <div className="player-card__meta">
                {genre && <span className="chip" style={{ background: "var(--yellow)" }}>{genre}</span>}
                {currMeta && <ArtistChip meta={currMeta} />}
              </div>
            )}
            <div className="player__controls" style={{ justifyContent: "center" }}>
              <button onClick={() => skip(-1)} className="player__nav" disabled={n < 2} aria-label="Previous">‹</button>
              <button onClick={toggle} className="player__play" disabled={n === 0 || loading} aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
              <button onClick={() => skip(1)} className="player__nav" disabled={n < 2} aria-label="Next">›</button>
              <button
                className={`player__like${likedIds.has(curr.id) ? " is-liked" : ""}`}
                onClick={() => toggleLike(curr.id)}
                aria-label={likedIds.has(curr.id) ? "Unlike" : "Like"}
              >{likedIds.has(curr.id) ? "♥" : "♡"} {likeCounts[curr.id] ?? 0}</button>
            </div>
            {nextTrack && (
              <button className="player-card__next" style={{ width: "100%" }} onClick={() => skip(1)}>
                <span className="player-card__next-label menu-type">next up</span>
                {nextTrack.image_url && <img src={croppedNext || nextTrack.image_url} alt={nextTrack.title} className="player-card__next-img" />}
                <span className="player-card__next-title">
                  <span className="player__song-text">{nextTrack.title}</span>
                  {nextMeta?.artist && <span className="player-card__next-author">{nextMeta.artist}</span>}
                </span>
                <span className="font-black opacity-40">›</span>
              </button>
            )}
            <TrackComments trackId={curr.id} />
          </div>
        </div>
      )}

      {/* Desktop: expanded = player-card inline; collapsed = mini card */}
      {expanded && isDesktop && curr ? (
        <div className="player-card" style={{ maxWidth: "30rem", margin: "0 auto" }}>
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
          <p style={{ fontFamily: "var(--font-menu)", fontSize: "0.7rem", letterSpacing: "0.07em", textTransform: "uppercase", opacity: 0.4, alignSelf: "flex-start" }}>
            {name}
          </p>
          <div className="player-card__cover">
            <img src={croppedCover || displayCover} alt={curr.title} />
          </div>
          <p className="player-card__song">
            {curr.title}
            {playing && <span className="now-shelf__dot ml-2 inline-block" />}
          </p>
          <div className="player-card__meta">
            {genre && <span className="chip" style={{ background: "var(--yellow)" }}>{genre}</span>}
            {currMeta && <ArtistChip meta={currMeta} />}
          </div>
          <div className="player__controls" style={{ justifyContent: "center" }}>
            <button onClick={() => skip(-1)} className="player__nav" disabled={n < 2} aria-label="Previous">‹</button>
            <button onClick={toggle} className="player__play" disabled={n === 0 || loading} aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
            <button onClick={() => skip(1)} className="player__nav" disabled={n < 2} aria-label="Next">›</button>
            <button
              className={`player__like${likedIds.has(curr.id) ? " is-liked" : ""}`}
              onClick={() => toggleLike(curr.id)}
              aria-label={likedIds.has(curr.id) ? "Unlike" : "Like"}
            >{likedIds.has(curr.id) ? "♥" : "♡"} {likeCounts[curr.id] ?? 0}</button>
          </div>
          <Scrubber progress={progress} seekTo={seekTo} />
          <div className="player__scrubber-time">
            <span>{elapsed || "0:00"}</span>
            <span>{remaining || fmtDuration(curr.duration)}</span>
          </div>
          <div className="player__modes">
            {(["seq", "loop", "random"] as const).map(m => (
              <button key={m} onClick={() => setPlayMode(m)} className={`player__mode${playMode === m ? " active" : ""}`} title={m === "seq" ? "Play all" : m === "loop" ? "Loop track" : "Shuffle"}>
                {m === "seq" ? "▶▶" : m === "loop" ? "↺" : "⇌"}
              </button>
            ))}
          </div>
          {nextTrack && (
            <button className="player-card__next" style={{ width: "100%" }} onClick={() => skip(1)}>
              <span className="player-card__next-label menu-type">next up</span>
              {nextTrack.image_url && <img src={croppedNext || nextTrack.image_url} alt={nextTrack.title} className="player-card__next-img" />}
              <span className="player-card__next-title">
                <span className="player__song-text">{nextTrack.title}</span>
                {nextMeta?.artist && <span className="player-card__next-author">{nextMeta.artist}</span>}
              </span>
              <span className="font-black opacity-40">›</span>
            </button>
          )}
          <TrackComments trackId={curr.id} />
        </div>
      ) : (
        miniCard
      )}
    </>
  );
}

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const songTitleRef = useRef<HTMLSpanElement>(null);
  const nextTitleRef = useRef<HTMLSpanElement>(null);
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [playMode, setPlayMode] = useState<"seq" | "loop" | "random">("seq");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [liked, setLiked] = useState<boolean[]>([]);
  const [remaining, setRemaining] = useState<string>("");
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [freshTracks, setFreshTracks] = useState<Track[]>([]);
  const [tipOpen, setTipOpen] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");

  /* Broadcast grid state: liveSync = following the station clock. Any manual
     navigation (prev/next, swipe, next-up, scrubber) leaves the live grid and
     turns the player into a free playlist until reload. */
  const liveSyncRef = useRef(true);
  const pendingSeekRef = useRef<number | null>(null);

  const selectTrack = (i: number | ((i: number) => number)) => {
    liveSyncRef.current = false;
    setTrackIdx(i);
  };

  function applySeek(a: HTMLAudioElement, offset: number) {
    if (a.readyState >= 1) {
      a.currentTime = offset;
    } else {
      const onMeta = () => {
        a.currentTime = Math.min(offset, Math.max(0, (a.duration || offset + 1) - 1));
        a.removeEventListener("loadedmetadata", onMeta);
      };
      a.addEventListener("loadedmetadata", onMeta);
    }
  }

  // Pause any active mini-player before the main player starts
  function handleBeforePlay(newAudio: HTMLAudioElement) {
    const mainAudio = audioRef.current;
    if (mainAudio && !mainAudio.paused) {
      mainAudio.pause();
      mainAudio.volume = 1;
      setPlaying(false);
    }
    if (activeAudioRef.current && activeAudioRef.current !== newAudio && !activeAudioRef.current.paused) {
      activeAudioRef.current.pause();
    }
    activeAudioRef.current = newAudio;
  }

  useEffect(() => {
    async function loadTracks() {
      const applyList = (list: Track[]) => {
        setTracks(list);
        setLiked(list.map(() => false));
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
    fetch("/api/custom-playlists")
      .then(r => r.json())
      .then(d => setPlaylists(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch("/api/fresh")
      .then(r => r.json())
      .then(d => {
        if (d.tracks && Array.isArray(d.tracks)) setFreshTracks(mapTracks(d.tracks));
      })
      .catch(() => {});
    fetch("/api/config")
      .then(r => r.json())
      .then(d => { if (d.stream_url) setStreamUrl(d.stream_url); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !tracks.length) return;
    const track = tracks[trackIdx];
    a.src = track?.audioUrl ?? "";
    setRemaining("");
    setProgress(0);
    setElapsed("");
    const seek = pendingSeekRef.current;
    if (seek !== null) {
      pendingSeekRef.current = null;
      if (seek > 2) applySeek(a, seek);
    }
    if (playing) a.play().catch(() => {});
    if ("mediaSession" in navigator && track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: AUTHOR,
        artwork: track.imageUrl ? [{ src: track.imageUrl, sizes: "512x512" }] : [],
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
    navigator.mediaSession.setActionHandler("play", () => { audioRef.current?.play().catch(() => {}); setPlaying(true); });
    navigator.mediaSession.setActionHandler("pause", () => { audioRef.current?.pause(); setPlaying(false); });
    navigator.mediaSession.setActionHandler("previoustrack", () => selectTrack(i => (i - 1 + n) % n));
    navigator.mediaSession.setActionHandler("nexttrack", () => selectTrack(i => (i + 1) % n));
    return () => {
      (["play","pause","previoustrack","nexttrack"] as MediaSessionAction[]).forEach(a => {
        navigator.mediaSession.setActionHandler(a, null);
      });
    };
  }, [tracks]);

  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const fmt = (s: number) =>
      `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const onTime = () => {
      if (isNaN(a.duration)) return;
      setRemaining(fmt(Math.max(0, a.duration - a.currentTime)));
      setElapsed(fmt(a.currentTime));
      setProgress(a.duration > 0 ? a.currentTime / a.duration : 0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onTime);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onTime);
    };
  }, [tracks.length > 0]);

  function seekTo(pct: number) {
    const a = audioRef.current;
    if (!a || isNaN(a.duration)) return;
    liveSyncRef.current = false;
    a.currentTime = pct * a.duration;
  }

  const playModeRef = useRef(playMode);
  useEffect(() => { playModeRef.current = playMode; }, [playMode]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => {
      const n = tracks.length || 1;
      const mode = playModeRef.current;
      if (mode === "loop") {
        a.currentTime = 0;
        a.play().catch(() => {});
      } else if (mode === "random") {
        setTrackIdx(Math.floor(Math.random() * n));
      } else {
        setTrackIdx(i => (i + 1) % n);
      }
    };
    a.addEventListener("ended", onEnded);
    return () => a.removeEventListener("ended", onEnded);
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
      if (
        document.visibilityState === "visible" &&
        window.matchMedia("(max-width: 767px)").matches &&
        audioRef.current &&
        !audioRef.current.paused
      ) {
        setExpanded(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  function toggleLike(i: number) {
    const trackId = tracks[i].id;
    const delta = liked[i] ? -1 : 1;
    setLikeCounts(prev => ({
      ...prev,
      [trackId]: Math.max(0, (prev[trackId] ?? 0) + delta),
    }));
    setLiked(ls => {
      const nextLs = ls.map((v, j) => (j === i ? !v : v));
      try { localStorage.setItem("ts-likes", JSON.stringify(nextLs)); } catch {}
      return nextLs;
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
    if (Math.abs(dx) < 40) return;
    liveSyncRef.current = false;
    setTrackIdx(i => {
      const len = tracks.length || 1;
      return dx < 0 ? (i + 1) % len : (i - 1 + len) % len;
    });
  }, [tracks.length]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      setPlaying(false);
      a.pause();
    } else {
      if (activeAudioRef.current && !activeAudioRef.current.paused) {
        activeAudioRef.current.pause();
      }
      // Joining the live grid: re-sync to "what's on air right now" — pausing
      // the radio means missing a piece, like a real station.
      if (liveSyncRef.current && playModeRef.current === "seq" && tracks.length > 1) {
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

  const currCover = useCroppedCover(tracks[trackIdx]?.imageUrl);
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

  return (
    <div className="min-h-screen flex flex-col gap-1.5 p-1.5" style={{ background: "var(--ink)" }}>
      {/* ── Mobile full-screen player (position:fixed at root to escape overflow:hidden) ── */}
      {expanded && curr && (
        <div className="player-fs" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="player-fs__topbar">
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
              <button onClick={() => selectTrack((trackIdx - 1 + n) % n)} className="player__nav" aria-label={`Previous: ${prevT.title}`}>‹</button>
              <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="player__play">{playing ? "❚❚" : "▶"}</button>
              <button onClick={() => selectTrack((trackIdx + 1) % n)} className="player__nav" aria-label={`Next: ${nextT.title}`}>›</button>
              <button onClick={() => toggleLike(trackIdx)} className={`player__like${liked[trackIdx] ? " is-liked" : ""}`} aria-label={liked[trackIdx] ? "Unlike" : "Like"}>{liked[trackIdx] ? "♥" : "♡"} {likeCount}</button>
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
            </div>
            <button className="player-card__next" style={{ width: "100%" }} onClick={() => selectTrack((trackIdx + 1) % n)}>
              <span className="player-card__next-label menu-type">next up</span>
              <img src={nextCover || nextT.imageUrl} alt={nextT.title} className="player-card__next-img" />
              <span className="player-card__next-title">
                <span className="player__song-text">{nextT.title}</span>
                <span className="player-card__next-author">{nextMeta?.artist || AUTHOR}</span>
              </span>
              <span className="font-black opacity-40">›</span>
            </button>
            <TrackComments trackId={curr.id} />
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
            {curr && (!expanded ? (
              <div className="player mx-auto mb-6" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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
                    aria-label={`Next: ${nextT.title}`}
                  >
                    ›
                  </button>
                </div>
              </div>
            ) : (
              <div className="player-card mx-auto mb-6" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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
                      aria-label={`Next: ${nextT.title}`}
                    >
                      ›
                    </button>
                    <button
                      onClick={() => toggleLike(trackIdx)}
                      className={`player__like${liked[trackIdx] ? " is-liked" : ""}`}
                      aria-label={liked[trackIdx] ? "Unlike" : "Like"}
                    >
                      {liked[trackIdx] ? "♥" : "♡"} {likeCount}
                    </button>
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
                  </div>
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
                  <TrackComments trackId={curr.id} />
                </div>
            ))}

            <h1 className="display text-2xl md:text-3xl mb-2" style={{ color: "var(--brown)" }}>
              Fresh Songs, Cooked Live.
            </h1>
            <p className="font-semibold text-sm md:text-base max-w-md mx-auto mb-7 opacity-80">
              Order a song. Watch us cook it. Hear it live.
            </p>
            <div className="flex items-center justify-center gap-3 mb-5">
              <a href="#order-track" className="pill pill-yellow text-base">Order a song</a>
              {streamUrl
                ? <a href={streamUrl} target="_blank" rel="noopener noreferrer" className="pill pill-paper text-base">Listen live</a>
                : <a href="#" className="pill pill-paper text-base" style={{ opacity: 0.4, pointerEvents: "none" }}>Listen live</a>
              }
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

      {/* ── Menu ───────────────────────────────── */}
      <section id="menu" className="rounded-xl px-5 md:px-12 py-12 md:py-16" style={{ background: "var(--cream)" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="display text-3xl md:text-5xl mb-2">Today&apos;s specials</h2>
          <p className="font-semibold opacity-70 mb-8">Thematic playlists from the kitchen — each one plays right here.</p>
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
                  onBeforePlay={handleBeforePlay}
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
          <h2 className="display text-3xl md:text-5xl mb-2">Fresh out of the kitchen</h2>
          <p className="font-semibold opacity-70 mb-8">
            Hot off the stove — tap to taste.
          </p>
          {freshTracks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {freshTracks.map((t) => (
                <FreshTrackCard key={t.id} track={t} onBeforePlay={handleBeforePlay} />
              ))}
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
    </div>
  );
}
