import { redirect } from "next/navigation";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Committee overview" };

export default async function AdminHome() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const overview = await getRepository().adminOverview(actor);
  if (!overview) return <p>This account cannot open the committee overview.</p>;
  return (
    <main id="main">
      <h1 className="font-serif text-4xl">Committee overview</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>Use this overview to coordinate authorised work, identify reviews due and keep follow-up organised. Access should follow a person’s assigned responsibilities, not committee membership alone.</p></div>
      {!overview.canSeeReportContent ? <p className="mt-4 rounded-dv bg-amber/20 p-4">Technical administration does not include routine access to report content. A separate coordinator or reviewer role is required, and that assignment is recorded.</p> : null}
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="dv-card p-4"><dt>Assigned or visible reports</dt><dd className="text-3xl font-semibold">{overview.queue}</dd></div>
        <div className="dv-card p-4"><dt>Update drafts</dt><dd className="text-3xl font-semibold">{overview.drafts}</dd></div>
        <div className="dv-card p-4"><dt>Awaiting publication</dt><dd className="text-3xl font-semibold">{overview.awaitingPublication}</dd></div>
        <div className="dv-card p-4"><dt>Questions</dt><dd className="text-3xl font-semibold">{overview.questions}</dd></div>
      </dl>
      <h2 className="mt-8 text-2xl">Reviews due</h2>
      {overview.reviewsDue.length === 0 ? <p className="mt-2">No review flag is recorded.</p> : overview.reviewsDue.map((item) => <p key={item.reference} className="mt-2">{item.reference} · next review {item.nextReviewDate}. This records that a review is due. It does not record a refusal to act.</p>)}
      <h2 className="mt-8 text-2xl">Retention review</h2>
      {overview.retentionDue.length === 0 ? <p className="mt-2">No record is due for a retention review.</p> : overview.retentionDue.map((item) => <p key={item.reference}>{item.reference} · review date {item.reviewOn}. Nothing is deleted automatically.</p>)}
    </main>
  );
}
