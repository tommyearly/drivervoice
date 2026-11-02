import { cookies } from "next/headers";
import { ProfileForm } from "@/components/forms";
import { PageIllustration } from "@/components/page-illustration";
import { signOutAction } from "@/server/actions";
import { getSessionActor } from "@/lib/auth/session";
import { readPendingSignup, signupComplete } from "@/lib/consent";
import { getRepository } from "@/lib/data/repository";
import { isPrivileged, resolveMode } from "@/lib/domain";
import { formatMobile } from "@/lib/phone";
import { redirect } from "next/navigation";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const store = getRepository();
  const [open, signup, jar] = await Promise.all([
    store.collectionState(),
    store.signupState(actor),
    cookies(),
  ]);
  const pending = readPendingSignup(jar.get("dv_pending_signup")?.value);
  const finished = signupComplete(signup);
  const mobile = signup?.mobile || pending?.mobile || "";
  const live = resolveMode(process.env) === "live";
  return (
    <main id="main" className="grid gap-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-serif text-4xl">Account</h1>
        <PageIllustration asset="privacy" variant="detail" />
      </div>
      <div className="grid gap-3 text-[var(--dv-muted)]">
        <p>Check the account details used by the forum and sign out after using a shared device. A display name does not make an authenticated submission anonymous. Do not share sign-in links or verification codes.</p>
      </div>
      <p>Signed in as {actor.displayName}. Roles on this account: {actor.roles.join(", ") || "none"}.</p>
      {isPrivileged(actor) ? <p>Privileged accounts need multi-factor authentication before live committee tools can be used. {live ? "This application does not yet show an authenticator enrolment screen. Ask a forum administrator to arrange account security. Do not request access to the hosting or database project." : "Demonstration sign-in does not turn on live access or multi-factor authentication."}</p> : null}
      <p>A request to close an account is assessed against the retention rules. Material under a preservation hold is not deleted automatically.</p>
      {finished && signup?.mobile ? (
        <p className="rounded-dv bg-teal/10 p-4">Terms accepted. Coordinators can WhatsApp {formatMobile(signup.mobile)}. That number is not shown on the public site.</p>
      ) : (
        <p className="rounded-dv bg-amber/25 p-4">Finish signup by adding your mobile number and accepting the terms. Forum forms stay closed until that is saved.</p>
      )}
      {!open ? <p>A mobile number is stored only when live collection is open. You can still read the terms and the privacy notice.</p> : null}
      <ProfileForm disabled={!open} name={actor.displayName} mobile={mobile} termsAccepted={finished} whatsappConsent={Boolean(signup?.whatsappConsent)} />
      <form action={signOutAction}><button className="touch rounded-full border border-navy/20 px-5 font-semibold">Sign out</button></form>
    </main>
  );
}
