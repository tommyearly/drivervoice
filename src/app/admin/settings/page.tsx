import { confirmPrivacyAction, publishPriorityAction, saveSettingsAction } from "@/server/actions";
import { PageIllustration } from "@/components/page-illustration";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";
import { redirect } from "next/navigation";

export const metadata = { title: "Settings" };

const fields = [
  ["controllerName", "Controller name"],
  ["controllerContact", "Controller contact"],
  ["purposes", "Processing purposes"],
  ["article6Basis", "Article 6 lawful basis"],
  ["article9Condition", "Article 9 condition, or the decision that special-category data is not processed"],
  ["processors", "Processors"],
  ["hosting", "Hosting"],
  ["transfers", "Transfers"],
  ["retention", "Category-specific retention and review periods"],
  ["rightsProcedure", "Rights-request procedure"],
  ["breachProcedure", "Breach-response procedure"],
  ["dpiaAssessment", "Assessment of whether a DPIA is required"],
] as const;

export default async function SettingsPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const store = getRepository();
  const settings = await store.settingsFor(actor);
  const writes = store.acceptsAdminWrites;
  return (
    <main id="main" className="grid gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Privacy configuration</h1>
          <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
            <p>The person or group deciding why and how records are processed must establish the privacy arrangements. Completing this screen or obtaining two internal confirmations does not certify GDPR compliance.</p>
            <p>Document an actual lawful basis and any required sensitive-data condition. Explain retention, recipients, rights and contact routes accurately. Verify both the notice and live access controls before enabling collection.</p>
          </div>
        </div>
        <PageIllustration asset="privacy" variant="detail" />
      </div>
      <p>Record the controller’s own decisions. This form does not supply a lawful basis, and one consent checkbox is not used as a universal legal basis. Live collection stays closed until a coordinator and a different technical administrator each confirm a complete record. Breach-response steps and the detailed DPIA assessment stay on this restricted screen.</p>
      {!settings ? <p>This account cannot edit privacy settings.</p> : (
        <form action={saveSettingsAction} className="grid gap-3">
          {fields.map(([name, label]) => (
            <label key={name}>{label}
              {name.endsWith("Name") || name.endsWith("Contact") ? <input name={name} className="dv-input mt-2" defaultValue={settings.settings[name]} /> : <textarea name={name} className="dv-textarea mt-2" defaultValue={settings.settings[name]} />}
            </label>
          ))}
          <label>Organising plan start date, optional<input type="date" name="organisingStartDate" className="dv-input mt-2" defaultValue={settings.settings.organisingStartDate ?? ""} /></label>
          <label>Publish the notice on the privacy page?
            <select name="publishNotice" className="dv-select mt-2" defaultValue={settings.settings.publishNotice ? "yes" : "no"}><option value="no">No</option><option value="yes">Yes</option></select>
          </label>
          <button className="touch w-fit rounded-full bg-teal px-4 font-semibold text-white" disabled={!settings.canEdit}>Save configuration</button>
          <p>{settings.ready ? "The recorded configuration meets the completeness checks." : "Live collection remains closed."}</p>
        </form>
      )}
      <form action={confirmPrivacyAction} className="flex flex-wrap gap-3">
        <button name="which" value="coordinator" className="touch rounded-full bg-navy px-4 font-semibold text-white" disabled={!writes}>Confirm as coordinator</button>
        <button name="which" value="tech_admin" className="touch rounded-full border border-navy/20 px-4 font-semibold" disabled={!writes}>Confirm as technical administrator</button>
      </form>
      <form action={publishPriorityAction} className="grid gap-3">
        <h2 className="text-2xl">Publish an agreed priority</h2>
        <p>The button does not create an agreement. Record how and when drivers or their authorised process adopted this priority. Leave out personal allegations, case references and negotiation offers.</p>
        <label>Specific requested outcome<input name="outcome" className="dv-input mt-2" /></label>
        <label>How success will be measured<input name="measure" className="dv-input mt-2" /></label>
        <label>Current stage<input name="stage" className="dv-input mt-2" /></label>
        <label>Last review date<input type="date" name="lastReview" className="dv-input mt-2" /></label>
        <label>How and when this was agreed<textarea name="agreement" className="dv-textarea mt-2" minLength={20} required /></label>
        <button className="touch w-fit rounded-full bg-navy px-4 font-semibold text-white" disabled={!writes}>Publish priority</button>
      </form>
    </main>
  );
}
