"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";

const STREAM_URL = "/sample.mp3";

const TICKER = [
  "NOW COOKING: opera about shawarma 🌯",
  "IN THE OVEN: hardbass Monday anthem 🔥",
  "JUST SERVED: disco track about your cat 🐱",
  "ORDER UP: country song for a birthday 🎂",
  "NOW COOKING: psychedelic funk burger 🍔",
];

const MENU = [
  {
    name: "Dish of the Day",
    desc: "One genre rules the whole show. Every order gets cooked in today's flavor.",
    chip: "Daily special",
    chipBg: "var(--yellow)",
  },
  {
    name: "Extra Spicy",
    desc: "Every half hour we grab the wildest, weirdest order in chat and cook it anyway.",
    chip: "Hot 🔥",
    chipBg: "var(--pink)",
  },
  {
    name: "Combo",
    desc: "Chat picks two genres that should never meet. We put them in one bun.",
    chip: "2-in-1",
    chipBg: "var(--violet)",
  },
  {
    name: "Blind Tasting",
    desc: "We play a fresh track — you guess what the order was. Winner picks the next dish.",
    chip: "Game",
    chipBg: "var(--mint)",
  },
];

const SUNO_PROFILE = "https://suno.com/@miguel2020";

const FRESH = [
  { title: "Shawarma Opera", author: "Chef Miguel", genre: "opera × street food", emoji: "🌯", duration: "3:12", likes: 42, sunoUrl: SUNO_PROFILE },
  { title: "Hard Bass Monday", author: "Chef Miguel", genre: "hardbass", emoji: "🧱", duration: "2:48", likes: 37, sunoUrl: SUNO_PROFILE },
  { title: "Disco Mother-in-Law", author: "Chef Miguel", genre: "disco", emoji: "🪩", duration: "3:35", likes: 58, sunoUrl: SUNO_PROFILE },
  { title: "Funk Burger Deluxe", author: "Chef Miguel", genre: "psychedelic funk", emoji: "🍔", duration: "4:02", likes: 24, sunoUrl: SUNO_PROFILE },
  { title: "Midnight Truck Stop", author: "Chef Miguel", genre: "country blues", emoji: "🚚", duration: "3:21", likes: 31, sunoUrl: SUNO_PROFILE },
  { title: "Neon Milkshake", author: "Chef Miguel", genre: "synthwave", emoji: "🥤", duration: "2:59", likes: 45, sunoUrl: SUNO_PROFILE },
];

const STEPS = [
  {
    n: "1",
    title: "Place your order",
    desc: "Drop a topic + a genre in the chat. “A track about my cat, Rammstein style” — that's a valid order.",
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

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState<boolean[]>(() => FRESH.map(() => false));

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ts-likes") ?? "[]");
      if (Array.isArray(saved)) setLiked(FRESH.map((_, i) => !!saved[i]));
    } catch {}
  }, []);

  function toggleLike(i: number) {
    setLiked(ls => {
      const nextLs = ls.map((v, j) => (j === i ? !v : v));
      try { localStorage.setItem("ts-likes", JSON.stringify(nextLs)); } catch {}
      return nextLs;
    });
  }

  const prev = FRESH[(trackIdx - 1 + FRESH.length) % FRESH.length];
  const curr = FRESH[trackIdx];
  const next = FRESH[(trackIdx + 1) % FRESH.length];
  const likeCount = curr.likes + (liked[trackIdx] ? 1 : 0);

  const touchX = useRef(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) < 40) return;
    setTrackIdx(i => dx < 0
      ? (i + 1) % FRESH.length
      : (i - 1 + FRESH.length) % FRESH.length
    );
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (playing) {
      a?.pause();
      setPlaying(false);
    } else {
      a?.play().catch(() => {});
      setPlaying(true);
    }
  }

  return (
    <div className="min-h-screen flex flex-col gap-1.5 p-1.5" style={{ background: "var(--ink)" }}>
      {/* ── Header ─────────────────────────────── */}
      <header
        className="rounded-xl flex items-center justify-between px-4 md:px-6 py-1.5 md:py-2"
        style={{ background: "var(--paper)" }}
      >
        <a href="#" className="flex items-center shrink-0 shine-wrap">
          <img src="/tracksnack-long.png" alt="TrackSnack" className="h-14 md:h-20 w-auto" />
        </a>
        <nav className="hidden md:flex items-center gap-5 menu-type text-lg">
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
        <div className="max-w-3xl mx-auto relative fade-up">
          <div className="billboard bulbs px-6 md:px-14 pt-10 pb-9 md:pt-12 md:pb-11 text-center">
            <span
              className="neon absolute top-5 right-6 text-sm md:text-base"
              style={{ transform: "rotate(3deg)" }}
            >
              OPEN 24/7
            </span>
            <audio ref={audioRef} src={STREAM_URL} preload="none" />
            <div className="relative aspect-square w-80 md:w-[26rem] mx-auto mb-6">
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
                  className="player__cover"
                  onClick={() => setExpanded(true)}
                  aria-label="Show track details"
                >
                  {curr.emoji}
                </button>
                <button className="player__info text-left" onClick={() => setExpanded(true)}>
                  <p className="player__song truncate">
                    {curr.title}
                    {playing && <span className="now-shelf__dot ml-2 inline-block" />}
                  </p>
                  <p className="player__author truncate">{curr.author}</p>
                </button>
                <div className="player__controls">
                  <button
                    onClick={() => setTrackIdx((trackIdx - 1 + FRESH.length) % FRESH.length)}
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
                    onClick={() => setTrackIdx((trackIdx + 1) % FRESH.length)}
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
                  ×
                </button>
                <span className="player-card__cover">{curr.emoji}</span>
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
                  {curr.author} ↗
                </a>
                <div className="player-card__meta">
                  <span className="chip" style={{ background: "var(--yellow)" }}>{curr.genre}</span>
                  <span className="chip" style={{ background: "var(--mint)" }}>⏱ {curr.duration}</span>
                </div>
                <div className="player__controls justify-center">
                  <button
                    onClick={() => setTrackIdx((trackIdx - 1 + FRESH.length) % FRESH.length)}
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
                    onClick={() => setTrackIdx((trackIdx + 1) % FRESH.length)}
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

          {/* Floating stickers */}
          <div
            className="sticker text-6xl hidden md:block"
            style={{ top: "-6%", left: "-15%", "--rot": "-10deg" } as React.CSSProperties}
          >
            🎸
          </div>
          <div
            className="sticker text-6xl hidden md:block"
            style={{ top: "10%", right: "-13%", "--rot": "12deg", animationDelay: "0.7s" } as React.CSSProperties}
          >
            🌭
          </div>
          <div
            className="sticker text-5xl hidden md:block"
            style={{ bottom: "18%", right: "-16%", "--rot": "-8deg", animationDelay: "1.3s" } as React.CSSProperties}
          >
            🎵
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
          <p className="font-semibold opacity-70 mb-8">Every dish is a live segment. Every order is cooked on air.</p>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
            {MENU.map((m) => (
              <div key={m.name} className="panel">
                <span className="chip mb-3" style={{ background: m.chipBg }}>{m.chip}</span>
                <h3 className="display text-xl md:text-2xl mb-2">{m.name}</h3>
                <p className="font-medium opacity-75 text-sm md:text-base">{m.desc}</p>
              </div>
            ))}
          </div>
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
            {FRESH.map((t) => (
              <div key={t.title} className="panel flex items-center gap-4 !p-4">
                <span
                  className="flex items-center justify-center text-3xl w-14 h-14 rounded-xl border-2 shrink-0"
                  style={{ borderColor: "var(--ink)", background: "var(--cream-deep)" }}
                >
                  {t.emoji}
                </span>
                <div className="min-w-0">
                  <p className="display text-base truncate">{t.title}</p>
                  <p className="menu-type text-sm opacity-60">{t.genre}</p>
                </div>
                <button
                  aria-label={`Play ${t.title}`}
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
