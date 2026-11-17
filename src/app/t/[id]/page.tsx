import type { Metadata } from "next";
import { findTrack } from "@/lib/findTrack";
import GoToTrack from "./GoToTrack";

/* The link that gets shared: https://…/t/<track id>. Chat apps read the tags
   below for the preview card (title + cover); people are sent on to the player. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const found = await findTrack(id);
  const track = found?.list[found.index];
  if (!track) return { title: "TrackSnack — Fresh Songs, Cooked Live" };
  const title = `${track.title} — TrackSnack`;
  const description = track.ordered_for
    ? `A fresh song cooked for ${track.ordered_for}. Listen on TrackSnack.`
    : "Fresh songs, cooked live. Listen on TrackSnack.";
  return {
    title,
    description,
    openGraph: { title, description, images: track.image_url ? [{ url: track.image_url }] : undefined },
    twitter: { card: "summary", title, description, images: track.image_url ? [track.image_url] : undefined },
  };
}

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GoToTrack id={id} />;
}
