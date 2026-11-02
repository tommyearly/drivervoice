import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionActor } from "@/lib/auth/session";
import { isPrivileged, resolveMode } from "@/lib/domain";

export const metadata = { robots: { index: false, follow: false } };

const links = [
  ["/portal", "Home"],
  ["/portal/reports", "My reports"],
  ["/portal/reports/new", "Submit a concern"],
  ["/portal/incidents/new", "Incident follow-up"],
  ["/portal/priorities", "Survey"],
  ["/portal/actions", "Actions"],
  ["/portal/updates", "Updates"],
  ["/portal/volunteer", "Volunteer"],
  ["/portal/questions", "Questions"],
  ["/portal/account", "Account"],
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  if (actor.status !== "active") {
    return (
      <main id="main" className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="font-serif text-4xl">Eligibility is still to be confirmed</h1>
        <p className="mt-4">Your sign-in is valid, but a coordinator still needs to confirm eligibility using minimal information. You do not need to send a staff ID photograph, a payslip or proof of union membership to be considered.</p>
      </main>
    );
  }
  const showMfa = resolveMode(process.env) === "live" && isPrivileged(actor) && actor.mfa !== "aal2";
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[16rem_1fr]">
      <nav aria-label="Portal" className="grid content-start gap-1">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="touch flex items-center rounded-xl px-3 hover:bg-white">{label}</Link>
        ))}
        {isPrivileged(actor) ? <Link href="/admin" className="touch flex items-center rounded-xl px-3 font-semibold text-teal">Committee tools</Link> : null}
      </nav>
      <div>
        {showMfa ? <p className="mb-4 rounded-dv bg-amber/30 p-4 font-semibold">Multi-factor authentication is required before this privileged account can be used. Open Account to enrol it.</p> : null}
        {children}
      </div>
    </div>
  );
}
