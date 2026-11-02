import { notFound, redirect } from "next/navigation";
import { PageIllustration } from "@/components/page-illustration";
import { addNoteAction, statusAction, verificationAction } from "@/server/actions";
import { REPORT_STATUSES } from "@/lib/domain";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Review report" };

export default async function AdminReport({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const { id } = await params;
  const store = getRepository();
  const view = await store.getReport(actor, id);
  if (!view) notFound();
  if (view.kind !== "committee") notFound();
  const report = view.report;
  const writes = store.acceptsAdminWrites;
  return (
    <main id="main" className="grid gap-6">
      <p className="text-sm font-bold uppercase tracking-wide text-teal">{report.reference}</p>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">{report.title}</h1>
          <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
            <p>Keep the driver’s account, supporting sources and reviewer assessment distinct. Mark only the specific factual point actually checked. Record what remains uncertain and avoid conclusions about guilt, liability or credibility that the forum is not equipped to determine.</p>
            <p>Where an issue belongs in a formal grievance, safeguarding, safety, protected-disclosure or legal process, help identify the appropriate route without republishing the underlying material.</p>
          </div>
        </div>
        <PageIllustration asset="records" variant="detail" />
      </div>
      <section className="dv-card p-5">
        <h2 className="text-2xl">Driver’s original account</h2>
        <p className="mt-2 text-sm">This text is kept separate from the committee assessment and is not overwritten.</p>
        <p className="mt-3 whitespace-pre-wrap">{report.whatHappened}</p>
      </section>
      <form action={verificationAction} className="dv-card grid gap-3 p-5">
        <h2 className="text-2xl">Source review</h2>
        <p>Record the source, the point checked and any limitation. A source check is not a legal finding. The signed-in reviewer’s account is stored with the check.</p>
        <input type="hidden" name="reportId" value={report.id} />
        <select name="status" className="dv-select" defaultValue={report.verificationStatus}>
          <option value="unverified">Unverified</option>
          <option value="awaiting_confirmation">Awaiting confirmation</option>
          <option value="verified">Source checked</option>
          <option value="not_verified">Not verified</option>
        </select>
        <label>Point checked<textarea name="pointChecked" className="dv-textarea mt-2" /></label>
        <label>Source<input name="source" className="dv-input mt-2" defaultValue={report.verificationSource ?? ""} /></label>
        <label>What this check does not establish<textarea name="limitations" className="dv-textarea mt-2" /></label>
        <button className="touch w-fit rounded-full bg-navy px-4 font-semibold text-white" disabled={!writes}>Save verification</button>
      </form>
      <form action={statusAction} className="grid gap-3">
        <h2 className="text-2xl">Status</h2>
        <input type="hidden" name="reportId" value={report.id} />
        <input type="hidden" name="reference" value={report.reference} />
        <select name="status" className="dv-select" defaultValue={report.status}>
          {REPORT_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
        </select>
        <button className="touch w-fit rounded-full bg-teal px-4 font-semibold text-white" disabled={!writes}>Update status</button>
      </form>
      <section>
        <h2 className="text-2xl">Private notes</h2>
        {report.notes.length === 0 ? <p className="mt-2">No notes.</p> : report.notes.map((note) => <article key={note.id} className="dv-card mt-3 p-4"><p>{note.body}</p><p className="text-sm">{note.authorName}</p></article>)}
        <form action={addNoteAction} className="mt-4 grid gap-3">
          <input type="hidden" name="reportId" value={report.id} />
          <textarea name="body" className="dv-textarea" aria-label="Private note" />
          <button className="touch w-fit rounded-full border border-navy/20 px-4 font-semibold" disabled={!writes}>Add private note</button>
        </form>
      </section>
    </main>
  );
}
