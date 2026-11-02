import type { Metadata } from "next";
import { PageIntro } from "@/components/chrome";
import { INDEPENDENCE_NOTICE, INTRODUCTION } from "../_forum-copy";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-14">
      <PageIntro eyebrow="About" title="An independent driver-led forum" lede={INTRODUCTION} />
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>Our aim is to help drivers communicate constructively about pay, rosters, working time and workplace support. Drivers Voice does not decide whether an employer, union or individual has broken the law.</p><p>A forum coordinator can help organise information and requests. That role does not automatically give anyone formal negotiating or union authority.</p></div>
      <div className="mt-8 grid gap-4 text-lg">
        <p>Drivers Voice is a place to raise workplace concerns privately, keep an accurate record, agree priorities, track follow-up and read updates approved for their stated audience.</p>
        <p>It supports proper representation and existing reporting procedures. It is not a company grievance system, a union ballot or a statutory complaints service.</p>
        <p>No committee appointments are shown here until drivers have actually confirmed them. Proposed roles are described on the working-plan page.</p>
        <p className="rounded-dv border border-navy/10 bg-white p-4">{INDEPENDENCE_NOTICE}</p>
      </div>
    </main>
  );
}
