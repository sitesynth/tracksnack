"use client";
import { useEffect } from "react";

export default function GoToTrack({ id }: { id: string }) {
  const href = `/?t=${encodeURIComponent(id)}`;
  useEffect(() => { window.location.replace(href); }, [href]);
  return (
    <p style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
      <a href={href}>Opening TrackSnack…</a>
    </p>
  );
}
