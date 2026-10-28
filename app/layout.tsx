import type { Metadata } from "next";
import "./globals.css";
import "./mildly-feral.css";

export const metadata: Metadata = {
  title: "Mildly Feral — IPA & Kombucha",
  description: "A personal brewing fieldbook for IPA and kombucha. Recipes, readings, photos and the next good batch.",
  icons: {
    icon: "/favicon.svg?v=cream-hop-1",
    shortcut: "/favicon.svg?v=cream-hop-1",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
