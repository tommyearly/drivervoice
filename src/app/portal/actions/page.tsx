import { redirect } from "next/navigation";
import { PageIllustration } from "@/components/page-illustration";
import { UPDATE_DUE_TEXT } from "../../_forum-copy";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Action tracker" };

export default async function ActionsPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const actions = await getRepository().listActions(actor);
  return (
    <main id="main">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Action tracker</h1>
          <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
            <p>Follow the actions agreed for this forum: the requested outcome, responsible role, target date and latest update. A target date is a planning commitment, not a legal deadline.</p>
            <p>An overdue review means an update is needed. It does not establish that the company, a union official or a driver has refused to act.</p>
          </div>
          <p className="mt-3">This tracker is for verified drivers. A public summary is published separately and is not created from a private report.</p>
        </div>
        <PageIllustration asset="our-plan" variant="dashboard" />
      </div>
      {actions.length === 0 ? <p className="mt-6">No actions have been recorded.</p> : (
        <ul className="mt-6 grid gap-4">
          {actions.map((action) => (
            <li key={action.id} className="dv-card p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-teal">{action.reference} · {action.status.replaceAll("_", " ")}</p>
              <h2 className="mt-2 text-2xl">{action.title}</h2>
              <p className="mt-2">{action.agreedOutcome}</p>
              <p>Responsible role: {action.responsibleRole}</p>
              <p>Agreed {action.dateAgreed}. Target {action.targetDate}. Next review {action.nextReviewDate}.</p>
              <p>Latest approved update: {action.latestUpdate}</p>
              {action.updateDue ? <p className="mt-3 font-semibold">{UPDATE_DUE_TEXT}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
