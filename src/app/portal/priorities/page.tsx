import { redirect } from "next/navigation";
import { PageIllustration } from "@/components/page-illustration";
import { SurveyForm } from "@/components/forms";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";
import { SURVEY_DISCLAIMER } from "../../_forum-copy";

export const metadata = { title: "Priorities survey" };

export default async function SurveyPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const store = getRepository();
  const state = await store.surveyState(actor);
  const open = await store.collectionState();
  return (
    <main id="main">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Priorities survey</h1>
          <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
            <p>Choose the three topics that matter most to you. You may edit a saved ranking while the survey remains open. Participation is voluntary and nobody should pressure you to rank a particular issue.</p>
            <p>This account-based consultation is confidential within the published access rules, not anonymous. It is not a formal union ballot or authority for industrial action.</p>
          </div>
          <p className="mt-3">{SURVEY_DISCLAIMER}</p>
          <p className="mt-3">{state?.open ? "This survey is open." : "No survey is open. Rankings are not being collected."}</p>
        </div>
        <PageIllustration asset="priorities" variant="dashboard" />
      </div>
      <p className="mt-3">{state?.aggregateNote}</p>
      <div className="mt-6"><SurveyForm disabled={!open || state?.open === false} current={state?.response ?? null} /></div>
    </main>
  );
}
