import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/chrome";
import { CookiePreferenceCard } from "@/components/consent-banner";

export const metadata: Metadata = { title: "Cookies" };

const rows = [
  {
    name: "Sign-in session",
    kind: "Essential",
    detail: "Keeps an invited driver signed in. In demonstration mode this is dv_demo_session. In live mode the sign-in provider sets its own session cookies. Rejecting optional cookies does not remove these, and it does not sign you out.",
  },
  {
    name: "dv_cookie_choice",
    kind: "Preference",
    detail: "Remembers Accept, Reject optional, or a custom choice for about six months so the notice stays closed. It stores the decision only, not your name, email, or mobile number.",
  },
  {
    name: "dv_pending_signup",
    kind: "Essential, short-lived",
    detail: "If you request a sign-in link, this holds the mobile number you typed for up to 12 hours so the account page can show it again. It is not advertising.",
  },
  {
    name: "Advertising or analytics",
    kind: "Not used",
    detail: "This site does not load advertising cookies, social pixels, or a third-party analytics product.",
  },
];

export default function CookiesPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-14">
      <PageIntro
        eyebrow="Cookies"
        title="What this browser is asked to remember"
        lede="The choice is yours. Essential sign-in cookies stay. Optional memory of that choice is the only extra."
      />
      <div className="mt-8 grid gap-4">
        {rows.map((row) => (
          <article key={row.name} className="dv-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">{row.kind}</p>
            <h2 className="mt-2 text-2xl">{row.name}</h2>
            <p className="mt-3 text-[var(--dv-muted)]">{row.detail}</p>
          </article>
        ))}
        <CookiePreferenceCard />
        <p className="text-[var(--dv-muted)]">
          How records are handled is on the <Link className="underline" href="/privacy">privacy notice</Link>. Account rules are in the <Link className="underline" href="/terms">terms and conditions</Link>.
        </p>
      </div>
    </main>
  );
}
