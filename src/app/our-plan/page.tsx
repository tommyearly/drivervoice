import type { Metadata } from "next";
import { PageIntro } from "@/components/chrome";
import { PageIllustration } from "@/components/page-illustration";
import { ILLUSTRATIVE_PRIORITIES, PROPOSED_COMMITTEE_ROLES } from "../_forum-copy";
import { planSchedule } from "@/lib/domain";
import { getRepository } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Our working plan" };

export default async function PlanPage() {
  const start = await getRepository().getOrganisingStartDate();
  const plan = planSchedule(start);
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-14">
      <PageIntro eyebrow="Working plan" title="A practical way to organise the work" lede="These are proposed steps. They are not a record of appointments, meetings or dispute developments." />
      <PageIllustration asset="our-plan" variant="public-banner" />
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
        <p>The aim is a reliable system: hear from drivers across shifts, identify common concerns, agree what to ask for, and report back on progress. A suggestion becomes an agreed position only through the appropriate participation and approval process.</p>
      </div>
      <nav className="mt-8 grid gap-2" aria-label="On this page">
        {["Committee", "Channels", "Priorities", "Process update", "Negotiating plan", "Evidence", "Review", "Two-week plan"].map((item) => (
          <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="touch inline-flex items-center text-teal">{item}</a>
        ))}
      </nav>
      <section id="committee" className="mt-12">
        <h2 className="text-3xl">Choose a small committee</h2>
        <p className="mt-4">Around five drivers representing different shifts and depots can share responsibility for gathering concerns, reviewing evidence, contacting representatives and keeping drivers informed. Existing shop stewards should be included where members support them. Formal representation follows the applicable union procedures.</p>
        <ul className="mt-6 grid gap-4">
          {PROPOSED_COMMITTEE_ROLES.map((role) => (
            <li key={role.title} className="dv-card p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-teal">Proposed role</p>
              <h3 className="mt-1 text-2xl">{role.title}</h3>
              <p className="mt-2">{role.body}</p>
            </li>
          ))}
        </ul>
      </section>
      <section id="channels" className="mt-12">
        <h2 className="text-3xl">Use clear communication channels</h2>
        <p className="mt-4">Approved updates carry confirmed information for a stated audience. Private website forms collect concerns, and the action tracker records agreed follow-up. This website does not host open discussion threads.</p>
        <p className="mt-4">Invitation links for any messaging group are shared individually by the communications lead. They are not published on this website.</p>
      </section>
      <section id="priorities" className="mt-12">
        <h2 className="text-3xl">Agree three priorities</h2>
        <p className="mt-4">Ask drivers to rank their concerns, then agree three measurable priorities. Record other concerns for further work.</p>
        <div className="mt-4 rounded-dv border border-amber bg-amber/15 p-4">
          <p className="font-semibold">Illustrative priorities, for discussion. They are not adopted policy.</p>
          <ul className="mt-3 list-disc pl-5">
            {ILLUSTRATIVE_PRIORITIES.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>
      <section id="process-update" className="mt-12">
        <h2 className="text-3xl">Request a written process update</h2>
        <p className="mt-4">Ask the appropriate union representative for the referral date, reference where available, claims submitted, current stage, relevant dates and next steps. Suggest a reply within five working days, or ask the representative to confirm a realistic date. This is an organisational request, not a statutory deadline. Confidential case references and negotiation material must remain restricted.</p>
      </section>
      <section id="negotiating-plan" className="mt-12">
        <h2 className="text-3xl">Ask for a negotiating plan</h2>
        <p className="mt-4">Request a members’ meeting, clear objectives and regular updates. Where requests remain unanswered, use the appropriate union escalation procedures.</p>
      </section>
      <section id="evidence" className="mt-12">
        <h2 className="text-3xl">Support concerns with evidence</h2>
        <p className="mt-4">Record accurate dates, figures and first-hand accounts. Do not collect more than the forum needs. Use the appropriate authorised channel for sensitive documents. An example may still identify someone even when their name has been removed.</p>
      </section>
      <section id="review" className="mt-12">
        <h2 className="text-3xl">Review progress together</h2>
        <p className="mt-4">Set review dates, explain proposals clearly and follow the applicable member approval procedures. Any industrial action requires appropriate union advice and procedures.</p>
      </section>
      <section id="two-week-plan" className="mt-12">
        <h2 className="text-3xl">Two-week organising plan</h2>
        <p className="mt-4">{plan.started ? "These are proposed dates, not a record that an activity has taken place." : "A start date has not been entered. These steps are a proposed order of work. They have not started, and no meeting has been recorded."}</p>
        <ol className="mt-6 grid gap-4">
          {plan.steps.map((step) => (
            <li key={step.label} className="dv-card p-5">
              <p className="font-semibold text-teal">{step.label}{step.from ? ` · ${step.from} to ${step.to}` : ""}</p>
              <p className="mt-2">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
