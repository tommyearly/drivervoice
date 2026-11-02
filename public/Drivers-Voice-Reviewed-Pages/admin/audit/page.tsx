import { redirect } from "next/navigation";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Audit" };

export default async function AuditPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const events = await getRepository().listAudit(actor);
  return (
    <main id="main">
      <h1 className="font-serif text-4xl">Audit history</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>Use audit entries to review access and changes. An entry records an event reported by the system; it does not by itself prove the lawfulness of access or the truth of a report. Do not copy report narratives into audit notes.</p></div>
      <p className="mt-3">Entries record the action and record identifier. They do not copy report narratives.</p>
      {events.length === 0 ? <p className="mt-4">No audit entries are visible to this account.</p> : (
        <ul className="mt-4 grid gap-2">{events.map((event) => <li key={event.id} className="rounded-xl bg-white px-4 py-3">{event.at.slice(0, 10)} · {event.action} · {event.entityType} {event.toStatus ?? ""}</li>)}</ul>
      )}
    </main>
  );
}
