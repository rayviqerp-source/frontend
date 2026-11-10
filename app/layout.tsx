import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/toast";
import { BottomNavShell } from "@/components/layout/bottom-nav-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RAYVIQ — Solar Service Operations Platform",
    template: "%s · RAYVIQ",
  },
  description:
    "RAYVIQ is an OEM-first solar inverter service coordination platform connecting manufacturers, service engineers, partners and customers.",
  applicationName: "RAYVIQ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        <StoreProvider>
          {children}
          <Toaster />
          <Suspense fallback={null}>
            <BottomNavShell />
          </Suspense>
        </StoreProvider>
      </body>
    </html>
  );
}
