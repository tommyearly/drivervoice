import Link from "next/link";
import { redirect } from "next/navigation";
import { CONCERN_CATEGORIES, REPORT_STATUSES } from "@/lib/domain";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Report queue" };

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ status?: string; category?: string }> }) {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const filters = await searchParams;
  const queue = await getRepository().listQueue(actor, { status: filters.status, category: filters.category });
  return (
    <main id="main">
      <h1 className="font-serif text-4xl">Report queue</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>Review only records within your authorised remit. Triage for urgency and the right reporting route before assessing a submission. Do not treat a report as a finding or disclose it more widely merely because it concerns a common issue.</p></div>
      <form className="mt-4 flex flex-wrap gap-3" method="get">
        <label>Status
          <select name="status" className="dv-select ml-2" defaultValue={filters.status || ""}>
            <option value="">All</option>
            {REPORT_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label>Category
          <select name="category" className="dv-select ml-2" defaultValue={filters.category || ""}>
            <option value="">All</option>
            {CONCERN_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <button className="touch rounded-full bg-navy px-4 font-semibold text-white">Filter</button>
      </form>
      {queue.length === 0 ? <p className="mt-6">No reports are visible to this account.</p> : (
        <ul className="mt-6 grid gap-3">{queue.map((item) => (
          <li key={item.id}><Link className="dv-card block p-4" href={`/admin/reports/${item.id}`}><span className="font-semibold">{item.reference}</span> · {item.title}<span className="mt-1 block text-sm">{item.category} · {item.status.replaceAll("_", " ")}{item.updateDue ? " · Update due" : ""}</span></Link></li>
        ))}</ul>
      )}
    </main>
  );
}
