import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Syne } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Effects from "@/components/Effects";
import Intro from "@/components/Intro";
import Menu from "@/components/Menu";
import Reveals from "@/components/Reveals";
import Runtime from "@/components/Runtime";
import PageTransition, { TransitionLink } from "@/components/Transition";
import { site } from "@/lib/site";
import { prePaintScript, themeCss } from "@/lib/themes";
import "./globals.css";

const syne = Syne({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-syne" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  alternates: { canonical: "./" },
  openGraph: { type: "website", siteName: site.name, locale: "en_IN", url: "./" },
  twitter: { card: "summary_large_image" },
};

// Structured company info for search engines.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: site.url,
  slogan: site.tagline,
  description: site.description,
  logo: `${site.url}/icon.svg`,
  contactPoint: { "@type": "ContactPoint", telephone: site.whatsapp.tel, contactType: "sales", availableLanguage: "English" },
};

export const viewport: Viewport = { themeColor: "#0D0A09", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Attributes are set by prePaintScript before hydration.
    <html lang="en" suppressHydrationWarning className={`${syne.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: prePaintScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </head>
      <body className="font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-fg focus:px-3 focus:py-2 focus:text-bg">
          Skip to content
        </a>
        <header className="fixed inset-x-0 top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-line/60 bg-bg/70 px-4 py-3 backdrop-blur-md sm:px-8">
          <TransitionLink href="/" className="whitespace-nowrap font-display text-sm font-extrabold uppercase tracking-[0.3em]">
            Aadyant Labs
          </TransitionLink>
          <Menu />
        </header>
        <Runtime />
        <Intro />
        <Reveals />
        <Effects />
        <PageTransition />
        <main id="main">{children}</main>
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-4 py-10 font-mono text-xs text-muted sm:px-8 lg:px-16">
          <span>© {new Date().getFullYear()} {site.name}</span>
          <span>{site.tagline}</span>
        </footer>
        {/* Their scripts are served by Vercel only; skip them elsewhere to avoid 404s. */}
        {process.env.VERCEL && <Analytics />}
        {process.env.VERCEL && <SpeedInsights />}
      </body>
    </html>
  );
}
