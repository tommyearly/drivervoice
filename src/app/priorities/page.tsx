import type { Metadata } from "next";
import { PageIntro } from "@/components/chrome";
import { PageIllustration } from "@/components/page-illustration";
import { ILLUSTRATIVE_PRIORITIES, PRIORITIES_EMPTY } from "../_forum-copy";
import { getRepository } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Agreed priorities" };

export default async function PrioritiesPage() {
  const [priorities, actions] = await Promise.all([
    getRepository().listAgreedPriorities(),
    getRepository().listPublicActionSummaries(),
  ]);
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-14">
      <PageIntro eyebrow="Priorities" title="Agreed priorities" lede="Drivers will be asked to rank concerns. Three measurable priorities can then be agreed and published here. Example topics are not adopted policy." />
      <PageIllustration asset="priorities" variant="public-banner" />
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
        <p>Tell us what would make the biggest practical difference to your working life. Survey responses help inform discussion; they do not, by themselves, create a negotiating mandate or settle a dispute.</p>
      </div>
      {priorities.length === 0 ? (
        <p className="dv-card mt-8 p-6 text-2xl font-semibold">{PRIORITIES_EMPTY}</p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {priorities.map((item) => (
            <li key={item.id} className="dv-card p-5">
              <h2 className="text-2xl">{item.outcome}</h2>
              <p className="mt-2">How success will be measured: {item.measure}</p>
              <p>Current stage: {item.stage}</p>
              <p>Last review: {item.lastReview}</p>
              {item.agreement ? <p>How this was agreed: {item.agreement}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <section className="mt-10">
        <h2 className="text-2xl">How consultation will work</h2>
        <p className="mt-3">Verified drivers can rank three distinct topics while a survey is open. The survey is an account-based consultation, not an anonymous ballot, a formal union ballot or authorisation for industrial action. Results are published only as approved totals, and only when there are enough responses to avoid identifying people.</p>
      </section>
      <aside className="mt-8 rounded-dv border border-amber bg-amber/15 p-4">
        <p className="font-semibold">Illustrative topics only</p>
        <ul className="mt-2 list-disc pl-5">{ILLUSTRATIVE_PRIORITIES.map((item) => <li key={item}>{item}</li>)}</ul>
      </aside>
      {actions.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl">Public action summaries</h2>
          <ul className="mt-4 grid gap-3">{actions.map((item) => <li key={item.reference} className="dv-card p-4"><p className="font-semibold">{item.reference}</p><p>{item.summary}</p></li>)}</ul>
        </section>
      ) : null}
    </main>
  );
}
