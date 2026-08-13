import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Personal Journal - Multi-Asset Trading & Behavioral Analytics",
  description: "Edge-ready Multi-User Trading Journal & Behavioral Analytics Application",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-amber-600 selection:text-white">
        <Providers>
          <Navbar />
          <main className="min-h-[calc(100vh-65px)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
