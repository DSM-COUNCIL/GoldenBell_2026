import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoldenBell 2026",
  description: "School festival realtime Golden Bell service",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <header className="topbar">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">🔔</span>
            GoldenBell <span className="brand-year">2026</span>
          </Link>
          <nav aria-label="Primary">
            <Link href="/">학생</Link>
            <Link href="/admin">운영자</Link>
            <Link href="/stage">무대</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
