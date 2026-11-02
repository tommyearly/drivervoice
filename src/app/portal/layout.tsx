import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionActor } from "@/lib/auth/session";
import { signupComplete } from "@/lib/consent";
import { getRepository } from "@/lib/data/repository";
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
  const store = getRepository();
  const [signup, open] = await Promise.all([store.signupState(actor), store.collectionState()]);
  const needsTerms = Boolean(signup) && !signupComplete(signup);
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
        {needsTerms ? (
          <p className="mb-4 rounded-dv border border-amber bg-amber/20 p-4">
            <span className="block font-semibold text-navy">Finish signup before you send a form</span>
            <span className="mt-1 block">
              {open
                ? <>Add the mobile number a coordinator may use on WhatsApp, and accept the current terms. <Link className="font-semibold underline" href="/portal/account">Open account</Link></>
                : <>The terms and a WhatsApp mobile are required. They can be saved once live collection is open. <Link className="font-semibold underline" href="/terms">Read the terms</Link></>}
            </span>
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
