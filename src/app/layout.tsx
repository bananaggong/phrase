import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phrase",
  description: "10단계 프로젝트 생성 위자드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
