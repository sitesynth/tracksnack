import Link from "next/link";

export const metadata = {
  title: "Thanks for the tip! — TrackSnack",
};

export default function CallbackPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: "var(--cream)" }}
    >
      <div className="panel max-w-md w-full px-8 py-10">
        <p className="text-6xl mb-4">🍳</p>
        <h1 className="display text-3xl md:text-4xl mb-3">
          Order received!
        </h1>
        <p className="font-semibold opacity-75 mb-6">
          Thanks for tipping the chef. Your generosity keeps the kitchen
          running and the music cooking.
        </p>
        <Link href="/" className="pill pill-red text-base">
          Back to the diner
        </Link>
      </div>
    </div>
  );
}
