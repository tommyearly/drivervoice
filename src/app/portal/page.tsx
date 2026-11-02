import Link from "next/link";
import { PageIllustration } from "@/components/page-illustration";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";
import { redirect } from "next/navigation";

export const metadata = { title: "Portal" };

export default async function PortalHome() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const dashboard = await getRepository().dashboard(actor);
  if (!dashboard) return <p>Your account cannot open the driver dashboard.</p>;
  return (
    <main id="main">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Hello, {actor.displayName}</h1>
          <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
            <p>Welcome to your driver hub. Here you can raise a concern, request incident follow-up, take part in consultation and read approved member updates. Other drivers do not need access to your individual report for the group to discuss a common theme.</p>
            <p>A forum report does not notify the company, file a WRC complaint or extend any legal deadline. Seek timely advice if a deadline or urgent issue may apply.</p>
          </div>
          <p className="mt-3 text-lg">Complete forms only when you are safely parked or off duty.</p>
        </div>
        <PageIllustration asset="home" variant="dashboard" />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="touch inline-flex items-center rounded-full bg-teal px-5 font-semibold text-white" href="/portal/reports/new">Submit a concern</Link>
        <Link className="touch inline-flex items-center rounded-full bg-navy px-5 font-semibold text-white" href="/portal/incidents/new">Record incident follow-up</Link>
      </div>
      <section className="mt-8">
        <h2 className="text-2xl">My reports</h2>
        {dashboard.reports.length === 0 ? <p className="mt-2">You have no reports.</p> : (
          <ul className="mt-3 grid gap-3">
            {dashboard.reports.map((report) => (
              <li key={report.id}><Link className="dv-card block p-4" href={`/portal/reports/${report.id}`}><span className="font-semibold">{report.reference}</span> · {report.title}<span className="mt-1 block text-sm uppercase tracking-wide text-teal">{report.status.replaceAll("_", " ")}</span></Link></li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-8">
        <h2 className="text-2xl">Requests for further information</h2>
        {dashboard.infoRequests.length === 0 ? <p className="mt-2">Nothing is waiting on you.</p> : (
          <ul className="mt-3 grid gap-3">{dashboard.infoRequests.map((item) => <li key={item.id} className="dv-card p-4"><p className="font-semibold">{item.reference}</p><p>{item.message}</p><p className="text-sm">Reply by {item.dueAt}. This is an organisational date, not a guarantee.</p><Link className="mt-2 inline-flex font-semibold text-teal" href={`/portal/reports/${item.reportId}`}>Reply on the report</Link></li>)}</ul>
        )}
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="dv-card p-4"><h2 className="text-xl">Survey</h2><p className="mt-2">{dashboard.survey.open ? (dashboard.survey.response ? "You have a saved ranking. You can edit it while the survey stays open." : "The priorities survey is open. Ranking is voluntary and is not a ballot.") : "No priorities survey is open for this account."}</p><Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-teal" href="/portal/priorities">{dashboard.survey.open ? "Open the survey" : "View the survey page"}</Link></article>
        <article className="dv-card p-4"><h2 className="text-xl">Next review</h2><p className="mt-2">{dashboard.nextReview ? `The next recorded review date is ${dashboard.nextReview}.` : "No review date has been recorded."}</p></article>
      </section>
    </main>
  );
}
