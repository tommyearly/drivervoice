import { AdminProcessForm } from "@/components/admin-process-form";
import { PageIllustration } from "@/components/page-illustration";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Process tracker" };

export default function ProcessPage() {
  return (
    <AdminProcessForm
      disabled={!getRepository().acceptsAdminWrites}
      mark={<PageIllustration asset="our-plan" variant="detail" />}
      intro={<div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>Track confirmed process information and requests for updates. Record the source and date for each confirmed entry. If the process or referral has not been confirmed, leave it unconfirmed.</p><p>Do not publish references, correspondence, settlement proposals, admissions or mediation material. Ask the authorised representative what may be shared for the actual process. A private portal is not an exemption from confidentiality obligations.</p></div>}
    />
  );
}
