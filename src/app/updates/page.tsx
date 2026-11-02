import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/chrome";
import { PageIllustration } from "@/components/page-illustration";
import { getRepository } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Approved updates" };

const labels = { verified_fact: "Source checked", proposal: "Proposal for discussion", awaiting_confirmation: "Awaiting confirmation" };

export default async function UpdatesPage() {
  const store = getRepository();
  const updates = await store.listPublicUpdates();
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-14">
      <PageIntro eyebrow="Updates" title="Approved updates" lede="Public updates explain the forum’s work and agreed next steps. Individual concerns and member-only correspondence do not belong on this page." />
      <PageIllustration asset="updates" variant="public-banner" />
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
        <p>Read updates approved by the forum for public release. Each update should explain its source, what is known, what is still being checked and when it will be reviewed. Approval by the forum is not approval by the company, SIPTU or the WRC.</p>
      </div>
      {store.mode === "demo" ? <p className="mt-6 rounded-dv bg-amber/20 p-4 font-semibold">Demonstration fixture. This is not a real update about any workplace process.</p> : null}
      {updates.length === 0 ? <p className="mt-8">No approved updates have been published.</p> : (
        <ul className="mt-8 grid gap-4">
          {updates.map((update) => (
            <li key={update.id}>
              <Link href={`/updates/${update.slug}`} className="dv-card block p-5 hover:border-teal">
                <p className="text-sm font-bold uppercase tracking-wide text-teal">{labels[update.classification]} · Public</p>
                <h2 className="mt-2 text-2xl">{update.headline}</h2>
                <p className="mt-2 text-[var(--dv-muted)]">{new Date(update.publishedAt).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" })}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
