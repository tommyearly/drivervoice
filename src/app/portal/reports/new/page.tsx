import { ConcernForm } from "@/components/forms";
import { PageIllustration } from "@/components/page-illustration";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Raise a concern" };

export default async function NewConcernPage() {
  const open = await getRepository().collectionState();
  return (
    <main id="main">
      <h1 className="font-serif text-4xl">Raise a workplace concern</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
        <p>Tell us what happened, when it happened, how it affected your work and what outcome you would like. Separate what you personally observed from information you received from others.</p>
        <p>Include only necessary details. Do not upload or copy confidential company records, passenger information or another person’s medical details. Use the appropriate company or representative channel for sensitive material.</p>
        <p>This form is not a formal grievance, accident report, protected-disclosure channel or WRC complaint. It does not preserve or extend a claim deadline.</p>
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <ConcernForm disabled={!open} />
        <PageIllustration asset="records" variant="form" className="order-first lg:order-none" />
      </div>
    </main>
  );
}
