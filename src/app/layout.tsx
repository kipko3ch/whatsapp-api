import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baileys WhatsApp API Platform",
  description: "Database-backed unofficial WhatsApp automation platform powered by Baileys.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
