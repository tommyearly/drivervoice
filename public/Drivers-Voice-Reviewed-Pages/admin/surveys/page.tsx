import { redirect } from "next/navigation";
import { publishSurveyAction } from "@/server/actions";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Survey" };

export default async function SurveysPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const store = getRepository();
  const admin = await store.surveyAdmin(actor);
  const writes = store.acceptsAdminWrites;
  if (!admin) return <main id="main"><h1 className="font-serif text-4xl">Survey</h1><p className="mt-4">Identifiable responses are limited to the survey administrator. This account can see approved totals only after they are published.</p></main>;
  return (
    <main id="main">
      <h1 className="font-serif text-4xl">Survey responses</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>Use rankings to describe consultation participation, not to claim that all drivers support a demand. State the survey dates, number of valid responses and method where results are published.</p><p>Suppress small or identifiable combinations and review free text separately. Never describe account-linked responses as anonymous or present this consultation as a statutory or union ballot.</p></div>
      <p className="mt-3">{admin.aggregateNote || "No aggregate has been approved."}</p>
      <form action={publishSurveyAction} className="mt-4 flex flex-wrap items-end gap-3">
        <label>Publish a suppressed total to
          <select name="audience" className="dv-select mt-2" defaultValue="committee" disabled={!writes}>
            <option value="committee">Committee</option>
            <option value="members">Verified drivers</option>
            <option value="public">Public</option>
          </select>
        </label>
        <button className="touch rounded-full bg-navy px-4 font-semibold text-white disabled:opacity-50" disabled={!writes || admin.withheld}>Publish totals</button>
      </form>
      <p className="mt-2 text-sm">The published total omits raw comments and individual rankings. Groups smaller than five must remain hidden; that threshold alone does not guarantee that nobody can be identified. The list below is visible only to the survey administrator.</p>
      {admin.withheld ? <p className="mt-3 font-semibold">Results are withheld because there are too few responses, or a combination could still identify someone.</p> : null}
      <ul className="mt-6 grid gap-3">{admin.responses.map((item) => <li key={item.profileName} className="dv-card p-4">{item.profileName}: {item.first}, {item.second}, {item.third}{item.otherText ? `. Other text is restricted and must not be published.` : ""}</li>)}</ul>
    </main>
  );
}
