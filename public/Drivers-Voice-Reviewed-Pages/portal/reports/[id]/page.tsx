import { notFound, redirect } from "next/navigation";
import { requestChangeAction } from "@/server/actions";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Report" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const { id } = await params;
  const store = getRepository();
  const view = await store.getReport(actor, id);
  if (!view || view.kind !== "owner") notFound();
  const report = view.report;
  const open = await store.collectionState();
  return (
    <main id="main" className="grid gap-6">
      <p className="text-sm font-bold uppercase tracking-wide text-teal">{report.reference} · {report.status.replaceAll("_", " ")} · {report.verificationStatus === "verified" ? "source checked" : report.verificationStatus.replaceAll("_", " ")}</p>
      <h1 className="font-serif text-4xl">{report.title}</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>This page contains your submitted account and the forum’s follow-up record. A source check does not establish that an allegation is true or determine anyone’s legal rights. You can ask for a correction or review without changing the historical record silently.</p></div>
      <p>A source-checked status records the forum’s review of specified information. It does not mean every part of the account has been established.</p>
      <section className="dv-card p-5"><h2 className="text-2xl">Your original account</h2><p className="mt-3 whitespace-pre-wrap">{report.whatHappened}</p></section>
      {report.memberSummary ? <section className="dv-card p-5"><h2 className="text-2xl">Approved member summary</h2><p className="mt-3">{report.memberSummary}</p></section> : null}
      <section>
        <h2 className="text-2xl">Requests</h2>
        {report.infoRequests.length === 0 ? <p className="mt-2">No information has been requested.</p> : report.infoRequests.map((item) => <article key={item.id} className="dv-card mt-3 p-4"><p>{item.message}</p><p className="text-sm">Due {item.dueAt}. {item.respondedAt ? "A reply has been added." : "Waiting for your reply."}</p></article>)}
      </section>
      <form action={requestChangeAction} className="grid gap-3">
        <h2 className="text-2xl">Ask for a correction or closure</h2>
        <p>This does not overwrite your original account. Retention and deletion requests are assessed where a record must lawfully be kept.</p>
        <input type="hidden" name="reportId" value={report.id} />
        <label className="font-semibold">What should be reviewed?
          <textarea name="message" className="dv-textarea mt-2" required minLength={10} />
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="touch rounded-full bg-navy px-4 font-semibold text-white disabled:opacity-50" name="kind" value="correction" disabled={!open}>Request a correction</button>
          <button className="touch rounded-full border border-navy/20 px-4 font-semibold disabled:opacity-50" name="kind" value="closure" disabled={!open}>Request closure</button>
        </div>
      </form>
    </main>
  );
}
