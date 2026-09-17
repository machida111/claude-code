import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "地域課題カルテ",
  description: "大阪府内市町村の地域課題を可視化する振興課職員向け業務システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="grid h-screen grid-cols-[220px_1fr]">
          <Sidebar />
          <div className="flex h-screen flex-col overflow-hidden">{children}</div>
        </div>
      </body>
    </html>
  );
}
