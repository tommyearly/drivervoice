import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Member updates" };

export default async function MemberUpdatesPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const dashboard = await getRepository().dashboard(actor);
  const updates = dashboard?.updates ?? [];
  return (
    <main id="main">
      <h1 className="font-serif text-4xl">Member updates</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>These updates are approved for their stated audience. Member-only material should not be forwarded or screenshotted into public groups. If wider sharing is appropriate, request a separately approved public summary.</p></div>
      {updates.length === 0 ? <p className="mt-4">No approved member updates.</p> : (
        <ul className="mt-6 grid gap-3">{updates.map((update) => <li key={update.id}><Link className="dv-card block p-4" href={update.audience === "public" ? `/updates/${update.slug}` : `/portal/updates/${update.slug}`}><span className="text-sm font-bold uppercase text-teal">{update.audience}</span><span className="mt-1 block text-xl">{update.headline}</span></Link></li>)}</ul>
      )}
    </main>
  );
}
