import { AdminActionForm } from "@/components/admin-action-form";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Actions" };

export default function AdminActions() {
  return <>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>Record an agreed action, the outcome requested, responsible role and next review date. Do not turn an allegation or an unanswered question into a statement of fault. Public summaries need separate review.</p></div>
      <AdminActionForm disabled={!getRepository().acceptsAdminWrites} />
    </>;
}
