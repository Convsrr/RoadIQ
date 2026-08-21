import type { Metadata, Viewport } from "next";
import { GeistMono, GeistSans } from "geist/font";
import { AppShell } from "@/components/roadiq/app-shell";
import { Providers } from "@/components/providers";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "RoadIQ — How Good a Driver Are You?", template: "%s | RoadIQ" },
  description: "See a real driving situation, make your call and compare your RoadIQ with other drivers.",
  applicationName: "RoadIQ",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "RoadIQ" },
  formatDetection: { telephone: false },
  openGraph: { type: "website", siteName: "RoadIQ", title: "How good a driver are you, really?", description: "Real situations. Split-second decisions. See how your RoadIQ compares." },
  twitter: { card: "summary_large_image", title: "RoadIQ", description: "How good a driver are you, really?" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0C" },
    { media: "(prefers-color-scheme: light)", color: "#F6F2EA" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground focus:translate-y-0">
          Skip to content
        </a>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
