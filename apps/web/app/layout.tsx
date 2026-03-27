import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HOOK — AI Social Media Automation",
  description: "Stop thumbs. Start funnels.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
