import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Topbar } from "@/components/layout/Topbar";

export const metadata: Metadata = {
  title: "PrestoLabs | 48시간 안에 아이디어를 결과물로",
  description: "AI 기반 외주 매칭 플랫폼 - WorkBridge",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#f7f8fa] text-gray-900 antialiased">
        <AuthProvider>
          <Topbar />
          <main className="pt-16">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
