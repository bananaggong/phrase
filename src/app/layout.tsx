import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phrase",
  description: "PHRASE 음원 유통 신청",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
