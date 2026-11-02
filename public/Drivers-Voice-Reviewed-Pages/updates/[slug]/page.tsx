import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data/repository";
import { whatsappAnnouncement, siteOrigin } from "@/lib/domain";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const update = await getRepository().getPublicUpdate(slug);
  if (!update) return { title: "Update" };
  return { title: update.headline, description: "An approved Drivers Voice update." };
}

export default async function UpdatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = getRepository();
  const update = await store.getPublicUpdate(slug);
  if (!update) notFound();
  const origin = siteOrigin();
  const share = whatsappAnnouncement({
    headline: update.headline,
    dateLabel: new Date(update.publishedAt).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" }),
    url: `${origin}/updates/${update.slug}`,
    origin,
  });
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-14">
      {store.mode === "demo" ? <p className="mb-6 rounded-dv bg-amber/20 p-4 font-semibold">Demonstration fixture. This is not a real update about any workplace process.</p> : null}
      <p className="text-sm font-bold uppercase tracking-wide text-teal">{update.classification === "verified_fact" ? "Source checked" : update.classification === "proposal" ? "Proposal for discussion" : "Awaiting confirmation"} · Public</p>
      <h1 className="mt-3 font-serif text-4xl">{update.headline}</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>This is a Drivers Voice update. A source-checked label records an editorial review; it is not a legal finding or a statement issued by the company, SIPTU or the WRC. Use the contact page to request a correction.</p></div>
      <p className="mt-3 text-[var(--dv-muted)]">{new Date(update.publishedAt).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" })}</p>
      <section className="mt-8 grid gap-6">
        <div><h2 className="text-2xl">What happened</h2><p className="mt-2">{update.whatHappened}</p></div>
        <div><h2 className="text-2xl">What remains unanswered</h2><p className="mt-2">{update.whatUnanswered}</p></div>
        <div><h2 className="text-2xl">Who is following up</h2><p className="mt-2">{update.followUpRole}</p></div>
        <div><h2 className="text-2xl">Next update due</h2><p className="mt-2">{update.nextUpdateDue ?? "Not set"}</p></div>
      </section>
      <section className="mt-8">
        <h2 className="text-2xl">Correction history</h2>
        {update.corrections.length === 0 ? <p className="mt-2">No corrections have been recorded.</p> : (
          <ul className="mt-3 list-disc pl-5">{update.corrections.map((item) => <li key={item.at}>{item.note}</li>)}</ul>
        )}
      </section>
      <section className="mt-8">
        <h2 className="text-2xl">Approved announcement text</h2>
        <p className="mt-2 text-sm text-[var(--dv-muted)]">Copy this text yourself if you want to share the approved update. This site does not send WhatsApp messages.</p>
        <pre className="mt-3 whitespace-pre-wrap rounded-dv bg-white p-4 text-base">{share}</pre>
      </section>
    </main>
  );
}
