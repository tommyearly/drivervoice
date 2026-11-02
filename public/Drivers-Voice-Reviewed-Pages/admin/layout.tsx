import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";
import { isPrivileged, resolveMode } from "@/lib/domain";

export const metadata = { robots: { index: false, follow: false }, title: "Administration" };

const links = [
  ["/admin", "Overview"],
  ["/admin/reports", "Reports"],
  ["/admin/actions", "Actions"],
  ["/admin/updates", "Updates"],
  ["/admin/surveys", "Survey"],
  ["/admin/volunteers", "Volunteers"],
  ["/admin/process-tracker", "Process tracker"],
  ["/admin/members", "Members"],
  ["/admin/audit", "Audit"],
  ["/admin/settings", "Settings"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  if (!isPrivileged(actor) || actor.status !== "active") {
    return <main id="main" className="mx-auto max-w-3xl px-5 py-14"><h1 className="font-serif text-4xl">You do not have access to administration</h1></main>;
  }
  if (resolveMode(process.env) === "live" && actor.mfa !== "aal2") redirect("/portal/account?mfa=required");
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[16rem_1fr]">
      <nav aria-label="Administration" className="grid content-start gap-1">
        {links.map(([href, label]) => <Link key={href} href={href} className="touch flex items-center rounded-xl px-3 hover:bg-white">{label}</Link>)}
      </nav>
      <div>
        {getRepository().acceptsAdminWrites ? null : (
          <p className="mb-4 rounded-dv bg-amber/30 p-4 font-semibold">Demonstration mode. Administration controls do not save records, send email or publish anything.</p>
        )}
        {children}
      </div>
    </div>
  );
}
