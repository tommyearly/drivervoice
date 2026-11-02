import { redirect } from "next/navigation";
import { PageIllustration } from "@/components/page-illustration";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Volunteers" };

export default async function VolunteersPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const volunteers = await getRepository().listVolunteers(actor);
  return (
    <main id="main">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Volunteer applications</h1>
          <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
            <p>Assess expressions of interest against the agreed selection process. Keep contact information restricted and record any decision separately from an application. Applying does not appoint a representative or authorise publication of a profile.</p>
          </div>
        </div>
        <PageIllustration asset="about" variant="detail" />
      </div>
      <p className="mt-3">An application does not appoint anyone. Contact details stay on this page.</p>
      {volunteers.length === 0 ? <p className="mt-4">No applications are visible to this account.</p> : (
        <ul className="mt-4 grid gap-3">{volunteers.map((item) => <li key={item.id} className="dv-card p-4"><p className="font-semibold">{item.name} · {item.preferredRole}</p><p>{item.statement}</p><p className="text-sm">Contact is restricted to this queue. Consent to consider a profile: {item.consentProfile ? "yes" : "no"}.</p></li>)}</ul>
      )}
    </main>
  );
}
