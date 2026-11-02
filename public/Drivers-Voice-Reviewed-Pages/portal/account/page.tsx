import { ProfileForm } from "@/components/forms";
import { signOutAction } from "@/server/actions";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";
import { isPrivileged, resolveMode } from "@/lib/domain";
import { redirect } from "next/navigation";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const open = await getRepository().collectionState();
  const live = resolveMode(process.env) === "live";
  return (
    <main id="main" className="grid gap-6">
      <h1 className="font-serif text-4xl">Account</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>Check the account details used by the forum and sign out after using a shared device. A display name does not make an authenticated submission anonymous. Do not share sign-in links or verification codes.</p></div>
      <p>Signed in as {actor.displayName}. Roles on this account: {actor.roles.join(", ") || "none"}.</p>
      {isPrivileged(actor) ? <p>Privileged accounts need multi-factor authentication before live committee tools can be used. {live ? "Use the forum’s account-security setup if available. If no enrolment option is shown, ask the forum administrator for help. Do not request access to the hosting or database project." : "Demonstration sign-in does not turn on live access or multi-factor authentication."}</p> : null}
      <p>A request to close an account is assessed against the retention rules. Material under a preservation hold is not deleted automatically.</p>
      <ProfileForm disabled={!open} name={actor.displayName} />
      <form action={signOutAction}><button className="touch rounded-full border border-navy/20 px-5 font-semibold">Sign out</button></form>
    </main>
  );
}
