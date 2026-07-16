import type { Metadata } from "next";
import { Alfa_Slab_One, Bebas_Neue, Overpass } from "next/font/google";
import "./globals.css";

const display = Alfa_Slab_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const menu = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-menu",
});

const sans = Overpass({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "TrackSnack — Fresh songs, cooked live.",
  description:
    "The roadside music diner. You order a track in chat, we cook it in minutes and serve it live on air.",
  icons: { icon: "/tracksnack.png" },
  openGraph: {
    title: "TrackSnack — Fresh songs, cooked live.",
    description:
      "The roadside music diner. Order a track, we cook it live in minutes.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${menu.variable} ${sans.variable}`}>
        {children}
      </body>
    </html>
  );
}
