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
  song_count: number;
  cover_url: string;
  display_name?: string;
  description?: string;
};

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
    desc: `Drop a topic + a genre in the chat. “A track about my cat, Rammstein style” — that's a valid order.`,
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

function PlaylistMiniPlayer({
  playlistId,
  coverUrl,
  name,
  displayName,
  description,
  onBeforePlay,
}: {
  playlistId: string;
  coverUrl: string;
  name: string;
  displayName?: string;
  description?: string;
  onBeforePlay: (audio: HTMLAudioElement) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [tracks, setTracks] = useState<RawTrack[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const shouldPlayRef = useRef(false);
  const tracksLenRef = useRef(0);

  useEffect(() => {
    fetch(`/api/playlist-tracks/${playlistId}`)
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
    const onEnded = () =>
      setIdx(i => (i + 1) % Math.max(1, tracksLenRef.current));
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
  const displayCover = curr?.image_url || coverUrl || "";

  return (
    <div className="playlist-mini">
      <audio ref={audioRef} preload="none" />
      <div className="playlist-mini__top">
        {displayCover
          ? <img src={displayCover} alt={name} className="playlist-mini__thumb" />
          : <div className="playlist-mini__thumb playlist-mini__thumb--empty" aria-hidden />
        }
        <div className="playlist-mini__info">
          <p className="playlist-mini__title">{displayName || name}</p>
          {description && <p className="playlist-mini__desc">{description}</p>}
          <p className="playlist-mini__track">
            {loading ? "…" : curr?.title || "—"}
            {playing && <span className="now-shelf__dot ml-2 inline-block" />}
          </p>
        </div>
      </div>
      <div className="playlist-mini__controls">
        <button
          className="player__nav"
          onClick={() => skip(-1)}
          disabled={n < 2}
          aria-label="Previous"
        >‹</button>
        <button
          className="player__play"
          onClick={toggle}
          disabled={n === 0 || loading}
          aria-label={playing ? "Pause" : "Play"}
        >{playing ? "❚❚" : "▶"}</button>
        <button
          className="player__nav"
          onClick={() => skip(1)}
          disabled={n < 2}
          aria-label="Next"
        >›</button>
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
  const [tracks, setTracks] = useState<Track[]>([]);
  const [liked, setLiked] = useState<boolean[]>([]);
  const [remaining, setRemaining] = useState<string>("");
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

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
      try {
        const qData = await fetch("/api/queue").then(r => r.json());
        if (Array.isArray(qData) && qData.length > 0) {
          const mapped = mapTracks(qData);
          setTracks(mapped);
          setLiked(mapped.map(() => false));
          return;
        }
      } catch {}
      const data: Track[] = await fetch("/tracks.json").then(r => r.json()).catch(() => []);
      setTracks(data);
      setLiked(data.map(() => false));
    }
    loadTracks();
    fetch("/api/likes")
      .then(r => r.json())
      .then(setLikeCounts)
      .catch(() => {});
    fetch("/api/playlists")
      .then(r => r.json())
      .then(setPlaylists)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !tracks.length) return;
    const track = tracks[trackIdx];
    a.src = track?.audioUrl ?? "";
    setRemaining("");
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
    navigator.mediaSession.setActionHandler("previoustrack", () => setTrackIdx(i => (i - 1 + n) % n));
    navigator.mediaSession.setActionHandler("nexttrack", () => setTrackIdx(i => (i + 1) % n));
    return () => {
      (["play","pause","previoustrack","nexttrack"] as MediaSessionAction[]).forEach(a => {
        navigator.mediaSession.setActionHandler(a, null);
      });
    };
  }, [tracks]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const fmt = (s: number) =>
      `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const onTime = () => {
      if (isNaN(a.duration)) return;
      setRemaining(fmt(Math.max(0, a.duration - a.currentTime)));
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onTime);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onTime);
    };
  }, []);

  useEffect(() => {
    for (const el of [songTitleRef.current, nextTitleRef.current]) {
      if (!el) continue;
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

  const touchX = useRef(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) < 40) return;
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
      a.play().catch(() => {});
      setPlaying(true);
    }
  }

  if (!tracks.length) return null;

  const n = tracks.length;
  const prev = tracks[(trackIdx - 1 + n) % n];
  const curr = tracks[trackIdx];
  const next = tracks[(trackIdx + 1) % n];
  const likeCount = likeCounts[curr.id] ?? curr.likes;

  return (
    <div className="min-h-screen flex flex-col gap-1.5 p-1.5" style={{ background: "var(--ink)" }}>
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
        <a href="#order" className="pill pill-red pill-sm text-sm py-2 px-4">Order a track</a>
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
            {!expanded ? (
              <div className="player mx-auto mb-6" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                <button
                  className="player__cover overflow-hidden"
                  onClick={() => setExpanded(true)}
                  aria-label="Show track details"
                >
                  <img src={curr.imageUrl} alt={curr.title} className="w-full h-full object-cover" />
                </button>
                <button className="player__info text-left" onClick={() => setExpanded(true)}>
                  <p className="player__song">
                    <span ref={songTitleRef} className="player__song-text">{curr.title}</span>
                    {playing && <span className="now-shelf__dot ml-2 inline-block" />}
                  </p>
                  <p className="player__author truncate">{AUTHOR}</p>
                </button>
                <div className="player__controls">
                  <button
                    onClick={() => setTrackIdx((trackIdx - 1 + n) % n)}
                    className="player__nav"
                    aria-label={`Previous: ${prev.title}`}
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
                    onClick={() => setTrackIdx((trackIdx + 1) % n)}
                    className="player__nav"
                    aria-label={`Next: ${next.title}`}
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
                <img src={curr.imageUrl} alt={curr.title} className="player-card__cover object-cover" />
                <p className="player-card__song">
                  {curr.title}
                  {playing && <span className="now-shelf__dot ml-2 inline-block" />}
                </p>
                <a
                  href={curr.sunoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="player-card__author"
                >
                  {AUTHOR} ↗
                </a>
                <div className="player-card__meta">
                  <span className="chip" style={{ background: "var(--yellow)" }}>{curr.genre}</span>
                  <span className="chip" style={{ background: "var(--mint)" }}>⏱ {remaining || curr.duration}</span>
                </div>
                <div className="player__controls justify-center">
                  <button
                    onClick={() => setTrackIdx((trackIdx - 1 + n) % n)}
                    className="player__nav"
                    aria-label={`Previous: ${prev.title}`}
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
                    onClick={() => setTrackIdx((trackIdx + 1) % n)}
                    className="player__nav"
                    aria-label={`Next: ${next.title}`}
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
                <button
                  className="player-card__next"
                  onClick={() => setTrackIdx((trackIdx + 1) % n)}
                >
                  <span className="player-card__next-label menu-type">next up</span>
                  <img src={next.imageUrl} alt={next.title} className="player-card__next-img" />
                  <span className="player-card__next-title"><span ref={nextTitleRef} className="player__song-text">{next.title}</span></span>
                  <span className="font-black opacity-40">›</span>
                </button>
              </div>
            )}

            <p className="menu-type text-xl md:text-2xl mb-2" style={{ color: "var(--brown)" }}>
              The roadside music diner
            </p>
            <p className="font-semibold text-sm md:text-base max-w-md mx-auto mb-7 opacity-80">
              You order a track in chat — topic plus genre. We cook it in the
              Suno oven and serve it live on air, still sizzling.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a href="#order" className="pill pill-yellow text-base">Order a track</a>
              <a href="#tips" className="pill pill-paper text-base">Tips</a>
            </div>
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
          <h2 className="display text-3xl md:text-5xl mb-2">Tonight&apos;s menu</h2>
          <p className="font-semibold opacity-70 mb-8">Thematic playlists from the kitchen — each one plays right here.</p>
          {playlists.length > 0 ? (
            <div className="playlist-row">
              {playlists.map(pl => (
                <PlaylistMiniPlayer
                  key={pl.id}
                  playlistId={pl.id}
                  coverUrl={pl.cover_url}
                  name={pl.name}
                  displayName={pl.display_name}
                  description={pl.description}
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
            Picked from a 382-track pantry. Tap to taste.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {tracks.slice(0, 6).map((t, i) => (
              <div key={t.id} className="panel flex items-center gap-4 !p-4">
                <img
                  src={t.imageUrl}
                  alt={t.title}
                  className="w-14 h-14 rounded-xl border-2 shrink-0 object-cover"
                  style={{ borderColor: "var(--ink)" }}
                />
                <div className="min-w-0">
                  <p className="display text-base truncate">{t.title}</p>
                  <p className="menu-type text-sm opacity-60">{t.genre}</p>
                </div>
                <button
                  aria-label={`Play ${t.title}`}
                  onClick={() => { setTrackIdx(i); setExpanded(false); if (!playing) toggle(); }}
                  className="ml-auto w-10 h-10 rounded-full border-2 shrink-0 font-black"
                  style={{ borderColor: "var(--ink)", background: "var(--yellow)", boxShadow: "0 3px 0 0 var(--ink)" }}
                >
                  ▶
                </button>
              </div>
            ))}
          </div>
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
            <a
              href="https://web.tribute.tg/p/PRODUCT_ID"
              target="_blank"
              rel="noopener noreferrer"
              className="pill pill-red text-base"
            >
              Leave a tip
            </a>
            <a
              href="https://telegram.me/tribute/app?startapp=pPRODUCT_ID"
              target="_blank"
              rel="noopener noreferrer"
              className="pill text-base"
              style={{ background: "var(--paper)", color: "var(--ink)", boxShadow: "0 6px 0 0 rgba(22,18,16,0.25)" }}
            >
              Tip via Telegram
            </a>
          </div>
        </div>
      </section>

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
