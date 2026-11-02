import "server-only";
import { cookies } from "next/headers";
import { resolveMode, type Actor } from "@/lib/domain";
import { sessionUserFromDemoCookie } from "@/lib/auth/demo-token";
import { getRepository } from "@/lib/data/repository";
import { createClient } from "@/lib/supabase/server";

export async function getSessionActor(): Promise<Actor | null> {
  const mode = resolveMode(process.env);
  if (mode !== "live") {
    const token = (await cookies()).get("dv_demo_session")?.value;
    const id = sessionUserFromDemoCookie(mode, token);
    if (!id) return null;
    const actor = await getRepository().actorById(id);
    return actor ? { ...actor, mfa: "aal1" } : null;
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const [{ data: profile }, { data: roles }, aal] = await Promise.all([
    supabase.from("profiles").select("display_name, status").eq("id", data.user.id).maybeSingle(),
    supabase.from("role_assignments").select("role").eq("profile_id", data.user.id).is("revoked_at", null),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (!profile) return null;
  return {
    id: data.user.id,
    displayName: profile.display_name || "Driver",
    status: profile.status,
    roles: (roles ?? []).map((item: { role: Actor["roles"][number] }) => item.role),
    mfa: aal.data?.currentLevel === "aal2" ? "aal2" : "aal1",
  };
}
