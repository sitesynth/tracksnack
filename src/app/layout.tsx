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
  title: "TrackSnack — AI Music on Demand | Custom Songs in Minutes",
  description:
    "Order a custom AI song about anything — any topic, any genre, cooked live in minutes. Interactive music radio where the audience writes the menu.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "TrackSnack — AI Music on Demand | Custom Songs in Minutes",
    description:
      "Order a custom AI song about anything — any topic, any genre, cooked live in minutes.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 603 }],
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
