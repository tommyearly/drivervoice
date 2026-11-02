import { notFound, redirect } from "next/navigation";
import { PageIllustration } from "@/components/page-illustration";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Member update" };

export default async function MemberUpdatePage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const { slug } = await params;
  const update = await getRepository().getMemberUpdate(actor, slug);
  if (!update) notFound();
  return (
    <main id="main">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-teal">{update.audience === "public" ? "Public" : "Verified drivers"}</p>
          <h1 className="mt-2 font-serif text-4xl">{update.headline}</h1>
          <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
            <p>Read this update in the context of its date, intended audience and any stated uncertainty. Member access does not make confidential dispute material suitable for circulation. Request clarification rather than filling gaps with rumours.</p>
          </div>
        </div>
        <PageIllustration asset="updates" variant="detail" />
      </div>
      <p className="mt-4">{update.whatHappened}</p>
      <h2 className="mt-6 text-2xl">Still awaiting an answer</h2>
      <p>{update.whatUnanswered}</p>
      <p className="mt-4">Following up: {update.followUpRole}</p>
      <p>Next update due: {update.nextUpdateDue ?? "Not set"}</p>
    </main>
  );
}
