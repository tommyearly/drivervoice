import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "My reports" };

export default async function ReportsPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const dashboard = await getRepository().dashboard(actor);
  const reports = dashboard?.reports ?? [];
  return (
    <main id="main">
      <h1 className="font-serif text-4xl">My reports</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>View the concerns and follow-up records linked to your account. A status shows the forum’s handling stage, not a company decision, finding of fault or guarantee of resolution.</p></div>
      {reports.length === 0 ? <p className="mt-4">You have not saved a report.</p> : (
        <ul className="mt-6 grid gap-3">{reports.map((report) => <li key={report.id}><Link className="dv-card block p-4" href={`/portal/reports/${report.id}`}>{report.reference}: {report.title}</Link></li>)}</ul>
      )}
    </main>
  );
}
