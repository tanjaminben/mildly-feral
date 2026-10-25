import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mildly Feral — Homebrew fieldbook",
  description: "A private recipe notebook, brewing guide, and photo journal. One good batch at a time.",
  icons: {
    icon: "/favicon.svg?v=hop",
    shortcut: "/favicon.svg?v=hop",
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
