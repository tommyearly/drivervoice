"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signDemoToken } from "@/lib/auth/demo-token";
import { getSessionActor } from "@/lib/auth/session";
import { acknowledgementEmail, invitationEmail, resolveMode, siteOrigin, statusEmail, type ReportStatus } from "@/lib/domain";
import { signupComplete, TERMS_VERSION } from "@/lib/consent";
import { normaliseMobile } from "@/lib/phone";
import { getRepository } from "@/lib/data/repository";
import { sendMail } from "@/lib/email/send";
import { consumeRate, hashRateKey } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Actor, Role } from "@/lib/domain";
import type { Result } from "@/lib/data/types";
import {
  actionSchema,
  concernSchema,
  fieldErrors,
  incidentSchema,
  inviteSchema,
  prioritySchema,
  privacySchema,
  processSchema,
  profileSchema,
  questionSchema,
  surveySchema,
  updateSchema,
  verificationSchema,
  volunteerSchema,
} from "@/lib/validation";

function limited(key: string): Result<never> | null {
  if (consumeRate(key, 8, 60_000).ok) return null;
  return { ok: false, error: "Too many attempts. Wait a minute and try again." };
}

function isActor(value: Actor | { ok: false; error: string }): value is Actor {
  return "roles" in value;
}

async function actorOrError(): Promise<Actor | { ok: false; error: string }> {
  const actor = await getSessionActor();
  if (!actor) return { ok: false, error: "Sign in required." };
  return actor;
}

async function signupGate(actor: Actor): Promise<Result<never> | null> {
  const state = await getRepository().signupState(actor);
  if (!state || signupComplete(state)) return null;
  return { ok: false, error: "Accept the current terms and save a WhatsApp mobile number on your account before sending this." };
}

export async function demoSignInAction(formData: FormData) {
  if (resolveMode(process.env) !== "demo") return;
  const token = signDemoToken(String(formData.get("demoUser") || ""));
  if (!token) return;
  const jar = await cookies();
  jar.set("dv_demo_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect("/portal");
}

export async function signOutAction() {
  const jar = await cookies();
  jar.delete("dv_demo_session");
  if (resolveMode(process.env) === "live") {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/sign-in");
}

export async function requestLinkAction(_prev: Result<{ sent: boolean }>, formData: FormData): Promise<Result<{ sent: boolean }>> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "Enter the email address used for your invitation." };
  const mobile = normaliseMobile(String(formData.get("mobile") || ""));
  if (!mobile) return { ok: false, error: "Enter the mobile number a coordinator may use on WhatsApp." };
  if (String(formData.get("whatsapp") || "") !== "yes") return { ok: false, error: "Confirm that a coordinator may contact that number on WhatsApp." };
  if (String(formData.get("terms") || "") !== "yes") return { ok: false, error: "Accept the terms and conditions before we email a sign-in link." };
  const jar = await cookies();
  jar.set("dv_pending_signup", JSON.stringify({ mobile, termsVersion: TERMS_VERSION }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  if (resolveMode(process.env) !== "live") {
    return { ok: false, error: "Email sign-in is available once Supabase is configured. The number you typed can be saved on your account after you sign in." };
  }
  const gate = limited(`signin:${hashRateKey(email)}`);
  if (gate) return gate;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${siteOrigin()}/auth/callback` },
  });
  if (error) return { ok: false, error: "A sign-in link could not be sent. Check that this email was invited." };
  return { ok: true, data: { sent: true } };
}

export async function submitConcernAction(_prev: Result<{ reference: string; status: string }>, formData: FormData): Promise<Result<{ reference: string; status: string }>> {
  const actor = await actorOrError();
  if (!isActor(actor)) return actor;
  const blocked = await signupGate(actor);
  if (blocked) return blocked;
  const gate = limited(`concern:${actor.id}`);
  if (gate) return gate;
  const parsed = concernSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const saved = await getRepository().saveConcern(actor, parsed.data);
  if (!saved.ok) return saved;
  if (parsed.data.intent === "submit" && resolveMode(process.env) === "live") {
    const origin = siteOrigin();
    await sendMail(String(formData.get("notifyEmail") || ""), acknowledgementEmail({ reference: saved.data.reference, signInUrl: `${origin}/sign-in`, origin })).catch(() => undefined);
  }
  revalidatePath("/portal");
  return { ok: true, data: { reference: saved.data.reference, status: saved.data.status } };
}

export async function submitIncidentAction(_prev: Result<{ reference: string; status: string }>, formData: FormData): Promise<Result<{ reference: string; status: string }>> {
  const actor = await actorOrError();
  if (!isActor(actor)) return actor;
  const blocked = await signupGate(actor);
  if (blocked) return blocked;
  const gate = limited(`incident:${actor.id}`);
  if (gate) return gate;
  const parsed = incidentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const saved = await getRepository().saveIncident(actor, parsed.data);
  if (!saved.ok) return saved;
  revalidatePath("/portal");
  return { ok: true, data: { reference: saved.data.reference, status: saved.data.status } };
}

export async function submitSurveyAction(_prev: Result<{ saved: true }>, formData: FormData): Promise<Result<{ saved: true }>> {
  const actor = await actorOrError();
  if (!isActor(actor)) return actor;
  const blocked = await signupGate(actor);
  if (blocked) return blocked;
  const parsed = surveySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  return getRepository().saveSurvey(actor, parsed.data);
}

export async function submitVolunteerAction(_prev: Result<{ saved: true }>, formData: FormData): Promise<Result<{ saved: true }>> {
  const actor = await actorOrError();
  if (!isActor(actor)) return actor;
  const blocked = await signupGate(actor);
  if (blocked) return blocked;
  const parsed = volunteerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  return getRepository().saveVolunteer(actor, parsed.data);
}

export async function submitQuestionAction(_prev: Result<{ reference: string }>, formData: FormData): Promise<Result<{ reference: string }>> {
  const parsed = questionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const actor = await getSessionActor();
  if (actor && actor.status === "active") {
    const blocked = await signupGate(actor);
    if (blocked) return blocked;
  }
  const key = hashRateKey(actor?.id || "public");
  const gate = limited(`question:${key}`);
  if (gate) return gate;
  const guest = actor ?? { id: "public", displayName: "Public", status: "pending" as const, roles: [], mfa: "aal1" as const };
  return getRepository().saveQuestion(guest, parsed.data);
}

export async function updateProfileAction(_prev: Result<{ saved: true }>, formData: FormData): Promise<Result<{ saved: true }>> {
  const actor = await actorOrError();
  if (!isActor(actor)) return actor;
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const saved = await getRepository().updateProfile(actor, parsed.data);
  if (saved.ok) {
    revalidatePath("/portal/account");
    revalidatePath("/admin/members");
  }
  return saved;
}

export async function addNoteAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  await getRepository().addNote(actor, { reportId: String(formData.get("reportId") || ""), body: String(formData.get("body") || "") });
}

export async function verificationAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  const status = String(formData.get("status") || "");
  const point = String(formData.get("pointChecked") || "").trim();
  const limits = String(formData.get("limitations") || "").trim();
  const source = String(formData.get("source") || "").trim();
  if (status === "verified" && (point.length < 8 || source.length < 8 || limits.length < 8)) return;
  const recorded = [point && `Point checked: ${point}`, source && `Source: ${source}`, limits && `Limits: ${limits}`].filter(Boolean).join(". ");
  const parsed = verificationSchema.safeParse({
    reportId: formData.get("reportId"),
    status,
    source: status === "verified" ? recorded : source,
  });
  if (!parsed.success) return;
  await getRepository().setVerification(actor, { reportId: parsed.data.reportId, status: parsed.data.status, source: parsed.data.source ?? "" });
  revalidatePath("/admin/reports");
}

export async function statusAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  const saved = await getRepository().transitionReport(actor, {
    reportId: String(formData.get("reportId") || ""),
    status: String(formData.get("status") || "") as ReportStatus,
  });
  if (saved.ok && resolveMode(process.env) === "live") {
    const origin = siteOrigin();
    const reference = String(formData.get("reference") || "");
    if (/^(DV|DVA|DVQ)-\d{4}-[A-Z2-9]{5}$/.test(reference)) {
      await sendMail("", statusEmail({ reference, status: String(formData.get("status")) as ReportStatus, signInUrl: `${origin}/sign-in`, origin })).catch(() => undefined);
    }
  }
}

export async function createUpdateAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const reviewer = actor.displayName.trim().length >= 3 ? actor.displayName.trim() : `account ${actor.id.slice(0, 8)}`;
  const sourceRecord = [
    parsed.data.pointChecked && `Point checked: ${parsed.data.pointChecked}`,
    parsed.data.sourceRecord && `Source: ${parsed.data.sourceRecord}`,
    parsed.data.limitations && `Limits: ${parsed.data.limitations}`,
  ].filter(Boolean).join(". ");
  await getRepository().createUpdate(actor, { ...parsed.data, reviewedBy: reviewer, sourceRecord: sourceRecord || parsed.data.sourceRecord || "" });
}

export async function reviewUpdateAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  await getRepository().reviewUpdate(actor, { id: String(formData.get("id") || "") });
}

export async function publishUpdateAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  await getRepository().publishUpdate(actor, { id: String(formData.get("id") || "") });
}

export async function saveActionAction(_prev: Result<{ id: string; reference: string }>, formData: FormData): Promise<Result<{ id: string; reference: string }>> {
  const actor = await actorOrError();
  if (!isActor(actor)) return actor;
  const parsed = actionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the action.", fieldErrors: fieldErrors(parsed.error) };
  return getRepository().saveAction(actor, parsed.data);
}

export async function saveProcessAction(_prev: Result<{ id: string }>, formData: FormData): Promise<Result<{ id: string }>> {
  const actor = await actorOrError();
  if (!isActor(actor)) return actor;
  const parsed = processSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the process entry.", fieldErrors: fieldErrors(parsed.error) };
  return getRepository().saveProcess(actor, parsed.data);
}

export async function publishPriorityAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  const parsed = prioritySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await getRepository().publishPriority(actor, parsed.data);
}

export async function saveSettingsAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  const parsed = privacySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await getRepository().saveSettings(actor, parsed.data);
}

export async function confirmPrivacyAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  const which = formData.get("which") === "tech_admin" ? "tech_admin" : "coordinator";
  await getRepository().confirmPrivacy(actor, { which });
}

export async function inviteAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  const parsed = inviteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return;
  const created = await getRepository().createInvitation(actor, parsed.data);
  if (!created.ok) return;
  const admin = createAdminClient();
  if (!admin) return;
  const link = await admin.auth.admin.generateLink({
    type: "invite",
    email: parsed.data.email,
    options: { redirectTo: `${siteOrigin()}/auth/callback` },
  });
  if (link.error || !link.data.properties?.action_link) return;
  const origin = siteOrigin();
  await sendMail(parsed.data.email, invitationEmail({ signInUrl: `${origin}/sign-in`, origin }));
}

export async function grantRoleAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  const role = String(formData.get("role") || "");
  if (!["driver", "reviewer", "coordinator", "editor", "publisher", "tech_admin", "survey_admin"].includes(role)) return;
  await getRepository().grantRole(actor, { profileId: String(formData.get("profileId") || ""), role: role as Role });
}

export async function revokeMemberAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  await getRepository().revokeMember(actor, { profileId: String(formData.get("profileId") || "") });
}

export async function publishSurveyAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  const audience = formData.get("audience");
  if (audience !== "committee" && audience !== "members" && audience !== "public") return;
  await getRepository().publishAggregate(actor, { audience });
}

export async function respondToInfoAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  const body = String(formData.get("body") || "").trim();
  if (body.length < 5) return;
  await getRepository().respondToInfo(actor, { requestId: String(formData.get("requestId") || ""), body });
}

export async function requestChangeAction(formData: FormData): Promise<void> {
  const actor = await actorOrError();
  if (!isActor(actor)) return;
  const kind = formData.get("kind") === "closure" ? "closure" : "correction";
  await getRepository().requestChange(actor, { reportId: String(formData.get("reportId") || ""), kind, message: String(formData.get("message") || "") });
}
