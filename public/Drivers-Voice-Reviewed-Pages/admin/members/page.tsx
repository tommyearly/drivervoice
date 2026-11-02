import { redirect } from "next/navigation";
import { grantRoleAction, inviteAction, revokeMemberAction } from "@/server/actions";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const store = getRepository();
  const members = await store.listMembers(actor);
  const writes = store.acceptsAdminWrites;
  return (
    <main id="main">
      <h1 className="font-serif text-4xl">Accounts</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>Invite eligible drivers using the minimum information needed. Grant only the roles required, review access when responsibilities change and record the reason for privileged access. Forum approval is not proof of union membership.</p></div>
      <p className="mt-3">Invitations do not request staff ID photographs, payslips or union cards. A coordinator confirms eligibility separately. You cannot grant a role to your own account.</p>
      <form action={inviteAction} className="mt-4 flex flex-wrap gap-3">
        <label className="font-semibold">Invite by email<input name="email" type="email" className="dv-input mt-2" /></label>
        <button className="touch self-end rounded-full bg-teal px-4 font-semibold text-white" disabled={!writes}>Create invitation</button>
      </form>
      <ul className="mt-6 grid gap-3">
        {members.map((member) => (
          <li key={member.id} className="dv-card p-4">
            <p className="font-semibold">{member.displayName}{member.fictional ? " · Fictional demonstration account" : ""}</p>
            <p className="text-sm">{member.status} · {member.roles.join(", ") || "no role"}</p>
            <form action={revokeMemberAction} className="mt-2"><input type="hidden" name="profileId" value={member.id} /><button className="touch rounded-full border border-navy/20 px-3" disabled={!writes}>Revoke access</button></form>
            <form action={grantRoleAction} className="mt-2 flex flex-wrap gap-2">
              <input type="hidden" name="profileId" value={member.id} />
              <select name="role" className="dv-select" defaultValue="reviewer">
                {["driver", "reviewer", "coordinator", "editor", "publisher", "survey_admin", "tech_admin"].map((role) => <option key={role}>{role}</option>)}
              </select>
              <button className="touch rounded-full bg-navy px-3 font-semibold text-white" disabled={!writes}>Grant role</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
