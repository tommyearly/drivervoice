import { IncidentForm } from "@/components/forms";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Incident follow-up" };

export default async function IncidentPage() {
  const open = await getRepository().collectionState();
  return (
    <main id="main">
      <h1 className="font-serif text-4xl">Incident follow-up record</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>Use this form to request follow-up after the relevant official reporting steps have been taken. Record only the minimum needed to explain what support or response is outstanding.</p><p>For immediate danger or an urgent safety concern, use the applicable emergency, control, engineering and official safety channels now. This forum is not monitored for emergencies.</p><p>Do not include passenger or child identities, witness contact lists, CCTV, detailed injury information or live operational-security details. Ask for a private callback through an appropriate representative where necessary.</p></div>
      <div className="mt-6"><IncidentForm disabled={!open} /></div>
    </main>
  );
}
