import { VolunteerForm } from "@/components/forms";
import { PageIllustration } from "@/components/page-illustration";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Volunteer" };

export default async function VolunteerPage() {
  const open = await getRepository().collectionState();
  return (
    <main id="main">
      <h1 className="font-serif text-4xl">Volunteer for the committee</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
        <p>Help with listening to drivers, organising records, checking sources or preparing updates. Expressing interest does not appoint you as a committee member, shop steward or negotiator.</p>
        <p>Any profile proposed for publication must be reviewed separately. Keep personal contact details out of a public candidate statement.</p>
      </div>
      <p className="mt-3">Tell us how you would like to help and what time you can offer. Selection and any formal appointments follow the applicable agreed procedures.</p>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <VolunteerForm disabled={!open} />
        <PageIllustration asset="about" variant="form" className="order-first lg:order-none" />
      </div>
    </main>
  );
}
