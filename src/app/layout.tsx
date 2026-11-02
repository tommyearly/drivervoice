import type { Metadata } from "next";
import { Literata, Source_Sans_3 } from "next/font/google";
import { DemoBanner, SiteFooter, SiteHeader } from "@/components/chrome";
import { DesignPanel } from "@/components/design-panel";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";
import { siteOrigin } from "@/lib/domain";
import { SUBTITLE } from "./_forum-copy";
import "./globals.css";

const display = Literata({ subsets: ["latin"], variable: "--font-literata", display: "swap" });
const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-source", display: "swap" });

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: "Drivers Voice", template: "%s · Drivers Voice" },
  description: SUBTITLE,
  applicationName: "Drivers Voice",
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [actor, store] = await Promise.all([getSessionActor(), Promise.resolve(getRepository())]);
  const open = await store.collectionState();
  return (
    <html lang="en" data-wave="slope" className={`${display.variable} ${body.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <DemoBanner mode={store.mode} open={open} />
        <SiteHeader signedIn={Boolean(actor && actor.status === "active")} />
        {children}
        <SiteFooter />
        {process.env.NEXT_PUBLIC_DESIGN_PANEL === "true" ? <DesignPanel /> : null}
      </body>
    </html>
  );
}
