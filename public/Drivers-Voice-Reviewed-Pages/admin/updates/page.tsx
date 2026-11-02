import { redirect } from "next/navigation";
import { createUpdateAction, publishUpdateAction, reviewUpdateAction } from "@/server/actions";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";
import { whatsappAnnouncement, siteOrigin } from "@/lib/domain";

export const metadata = { title: "Updates" };

export default async function AdminUpdates() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const store = getRepository();
  const drafts = await store.listUpdateDrafts(actor);
  const writes = store.acceptsAdminWrites;
  return (
    <main id="main" className="grid gap-8">
      <h1 className="font-serif text-4xl">Weekly update workflow</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>Write each update for a defined audience and check factual accuracy, necessity, privacy and any process restrictions before publication. A source check is an editorial step, not legal clearance.</p><p>Exclude identifying allegations and confidential dispute material from public drafts. Do not publish information merely because a submitter agreed to share it; other people’s rights and existing restrictions may still apply.</p></div>
      <p>Draft, editorial review and publication are separate. Private submissions are never published automatically. Do not send this text to management or SIPTU from this page.</p>
      <form action={createUpdateAction} className="grid gap-3">
        <h2 className="text-2xl">New draft</h2>
        <label>Headline<input name="headline" className="dv-input mt-2" /></label>
        <label>Audience<select name="audience" className="dv-select mt-2"><option value="members">Verified drivers</option><option value="public">Public</option></select></label>
        <label>Classification<select name="classification" className="dv-select mt-2"><option value="proposal">Proposal for discussion</option><option value="awaiting_confirmation">Awaiting confirmation</option><option value="verified_fact">Source checked</option></select></label>
        <label>This week<textarea name="thisWeek" className="dv-textarea mt-2" /></label>
        <label>Still awaiting an answer<textarea name="stillAwaiting" className="dv-textarea mt-2" /></label>
        <label>Actions being followed up<textarea name="actionsFollowed" className="dv-textarea mt-2" /></label>
        <label>What drivers can contribute<textarea name="driverContribution" className="dv-textarea mt-2" /></label>
        <label>Next update due<input type="date" name="nextUpdateDue" className="dv-input mt-2" /></label>
        <label>Follow-up role<input name="followUpRole" className="dv-input mt-2" defaultValue="Communications lead (proposed role)" /></label>
        <label>Restricted source, required for source-checked information<textarea name="sourceRecord" className="dv-textarea mt-2" /></label>
        <label>Reviewer name, required for source-checked information<input name="reviewedBy" className="dv-input mt-2" /></label>
        <label>Internal note, not published<textarea name="internalNote" className="dv-textarea mt-2" /></label>
        <button className="touch w-fit rounded-full bg-teal px-4 font-semibold text-white" disabled={!writes}>Save draft</button>
      </form>
      <section className="grid gap-4">
        <h2 className="text-2xl">Existing drafts</h2>
        {drafts.length === 0 ? <p>No drafts are visible to this account.</p> : drafts.map((draft) => {
          let share = "";
          if (draft.status === "published" && draft.audience === "public") {
            try {
              share = whatsappAnnouncement({ headline: draft.headline, dateLabel: draft.publishedAt.slice(0, 10) || "Date not set", url: `${siteOrigin()}/updates/${draft.slug}`, origin: siteOrigin() });
            } catch {
              share = "";
            }
          }
          return (
            <article key={draft.id} className="dv-card p-4">
              <p className="text-sm font-bold uppercase text-teal">{draft.status} · {draft.audience}</p>
              <h3 className="text-xl">{draft.headline}</h3>
              {draft.internalNote ? <p className="mt-2 text-sm">Internal note is stored separately and is not part of the public text.</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={reviewUpdateAction}><input type="hidden" name="id" value={draft.id} /><button className="touch rounded-full border border-navy/20 px-4 font-semibold" disabled={!writes}>Send for publication approval</button></form>
                <form action={publishUpdateAction}><input type="hidden" name="id" value={draft.id} /><button className="touch rounded-full bg-navy px-4 font-semibold text-white" disabled={!writes}>Approve and publish</button></form>
              </div>
              {share ? <pre className="mt-3 whitespace-pre-wrap text-sm">{share}</pre> : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
