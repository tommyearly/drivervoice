import Link from "next/link";
import { Mark } from "@/components/icons";
import { INDEPENDENCE_NOTICE, SITE_DOMAIN, SITE_NAME, SUBTITLE } from "@/lib/copy";

const links = [
  ["Our plan", "/our-plan"],
  ["Priorities", "/priorities"],
  ["Updates", "/updates"],
  ["About", "/about"],
  ["Conduct", "/code-of-conduct"],
];

export function Wordmark({ tone = "light" }: { tone?: "light" | "dark" }) {
  const color = tone === "light" ? "text-white" : "text-navy";
  return (
    <span className={`inline-flex items-center gap-2.5 ${color}`}>
      <Mark className="h-10 w-10" />
      <span>
        <span className="block font-serif text-[1.35rem] leading-none">{SITE_NAME}</span>
        <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] opacity-80">{SITE_DOMAIN}</span>
      </span>
    </span>
  );
}

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="rounded-md">
          <Wordmark />
          <span className="sr-only">{SITE_NAME} home</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="touch inline-flex items-center rounded-full px-3 text-[1.02rem] text-white/90 hover:bg-white/10">
              {label}
            </Link>
          ))}
          <Link href={signedIn ? "/portal" : "/sign-in"} className="touch ml-2 inline-flex items-center rounded-full bg-teal px-4 font-semibold text-white">
            {signedIn ? "Portal" : "Driver sign in"}
          </Link>
        </nav>
        <details className="relative lg:hidden">
          <summary className="touch cursor-pointer list-none rounded-full border border-white/20 px-4 py-2 font-semibold">Menu</summary>
          <nav className="absolute right-0 z-30 mt-2 w-64 rounded-dv bg-white p-2 text-navy shadow-dv" aria-label="Mobile">
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="touch flex items-center rounded-xl px-3 hover:bg-paper">
                {label}
              </Link>
            ))}
            <Link href={signedIn ? "/portal" : "/sign-in"} className="touch mt-1 flex items-center rounded-xl bg-teal px-3 font-semibold text-white">
              {signedIn ? "Portal" : "Driver sign in"}
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xl text-white/80">{SUBTITLE}</p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">{INDEPENDENCE_NOTICE}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-white/90">
          {[
            ["/about", "About"],
            ["/code-of-conduct", "Conduct"],
            ["/privacy", "Privacy"],
            ["/contact", "Contact"],
            ["/sign-in", "Driver sign in"],
            ["/our-plan", "Working plan"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="touch inline-flex items-center rounded-lg px-2 hover:bg-white/10">
              {label}
            </Link>
          ))}
        </div>
      </div>
      <p className="border-t border-white/10 px-5 py-4 text-center text-sm text-white/70">
        This website is not monitored for emergencies. Passenger service queries belong on the{" "}
        <a className="underline" href="https://www.goaheadireland.ie/" rel="external noreferrer">official Go-Ahead Ireland website</a>.
      </p>
    </footer>
  );
}

export function DemoBanner({ mode, open }: { mode: "demo" | "live"; open: boolean }) {
  if (mode === "live" && open) return null;
  return (
    <p className="bg-amber px-5 py-3 text-center text-base font-semibold text-navy" role="status">
      {mode === "demo"
        ? "Demonstration mode. The records shown are fictional. Forms do not save or send anything you type."
        : "Live collection is not open. Privacy configuration is incomplete, so reports and uploads are turned off."}
    </p>
  );
}

export function PageIntro({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return (
    <header className="mx-auto max-w-3xl">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal">{eyebrow}</p>
      <h1 className="mt-3 font-serif text-4xl text-navy md:text-5xl">{title}</h1>
      <p className="mt-5 text-xl leading-relaxed text-[var(--dv-muted)]">{lede}</p>
    </header>
  );
}
