import { PRIVATE_SENTENCE } from "@/lib/copy";

export type Role =
  | "driver"
  | "reviewer"
  | "coordinator"
  | "editor"
  | "publisher"
  | "tech_admin"
  | "survey_admin";

export type AccountStatus = "pending" | "active" | "suspended" | "revoked";

export type ReportStatus =
  | "draft"
  | "received"
  | "triage"
  | "more_information_needed"
  | "under_review"
  | "referred"
  | "awaiting_response"
  | "resolved"
  | "closed";

export type VerificationStatus = "unverified" | "awaiting_confirmation" | "verified" | "not_verified";

export type ActionStatus =
  | "proposed"
  | "agreed"
  | "in_progress"
  | "awaiting_reply"
  | "completed"
  | "closed";

export type UpdateStatus = "draft" | "in_review" | "published";

export type Classification = "verified_fact" | "proposal" | "awaiting_confirmation";

export type Audience = "public" | "members";

export interface Actor {
  id: string;
  displayName: string;
  status: AccountStatus;
  roles: Role[];
  mfa: "aal1" | "aal2";
}

export const PRIVILEGED_ROLES: Role[] = [
  "reviewer",
  "coordinator",
  "editor",
  "publisher",
  "tech_admin",
  "survey_admin",
];

export const CONCERN_CATEGORIES = [
  "Pay or payroll",
  "Rosters",
  "Late finish or overtime",
  "Breaks or facilities",
  "Communication",
  "Safety concern",
  "Other",
] as const;

export const INCIDENT_CATEGORIES = [
  "Service or duty",
  "Safety follow-up",
  "Injury or welfare",
  "Disciplinary",
  "Third-party matter",
  "Other",
] as const;

export const SENSITIVE_INCIDENT = ["Injury or welfare", "Disciplinary", "Third-party matter"] as const;

export const SURVEY_OPTIONS = [
  "Basic pay",
  "Rosters",
  "Overtime and payroll accuracy",
  "Breaks and facilities",
  "Communication",
  "Other",
] as const;

export const REPORT_STATUSES = [
  "received",
  "triage",
  "more_information_needed",
  "under_review",
  "referred",
  "awaiting_response",
  "resolved",
  "closed",
] as const satisfies readonly ReportStatus[];

export const ACTION_STATUSES = [
  "proposed",
  "agreed",
  "in_progress",
  "awaiting_reply",
  "completed",
  "closed",
] as const satisfies readonly ActionStatus[];

export function hasRole(actor: Actor | null, role: Role): boolean {
  return Boolean(actor && actor.status === "active" && actor.roles.includes(role));
}

export function isPrivileged(actor: Actor): boolean {
  return actor.roles.some((role) => PRIVILEGED_ROLES.includes(role));
}

export function mfaSatisfied(actor: Actor, enforce: boolean): boolean {
  if (!enforce || !isPrivileged(actor)) return true;
  return actor.mfa === "aal2";
}

/** Client-supplied role claims are ignored. Roles come from the stored assignment. */
export function rolesFromRecord(roles: Role[], claimed?: unknown): Role[] {
  void claimed;
  return [...roles];
}

export interface AssignmentRef {
  reportId: string;
  assigneeId: string;
  removedAt: string | null;
}

export function isAssigned(assignments: AssignmentRef[], reportId: string, actorId: string): boolean {
  return assignments.some(
    (item) => item.reportId === reportId && item.assigneeId === actorId && !item.removedAt,
  );
}

export function canReadReport(
  actor: Actor | null,
  report: { id: string; ownerId: string; status: ReportStatus },
  assignments: AssignmentRef[],
): boolean {
  if (!actor || actor.status !== "active") return false;
  const owner = actor.id === report.ownerId && hasRole(actor, "driver");
  if (report.status === "draft") return owner;
  if (owner) return true;
  if (hasRole(actor, "coordinator")) return true;
  if (hasRole(actor, "reviewer") && isAssigned(assignments, report.id, actor.id)) return true;
  return false;
}

export function canReadNotes(
  actor: Actor | null,
  report: { id: string; ownerId: string; status: ReportStatus },
  assignments: AssignmentRef[],
): boolean {
  if (!actor || !canReadReport(actor, report, assignments)) return false;
  if (hasRole(actor, "coordinator")) return true;
  return hasRole(actor, "reviewer") && isAssigned(assignments, report.id, actor.id);
}

export function canReadSurveyResponse(actor: Actor | null, profileId: string): boolean {
  if (!actor || actor.status !== "active") return false;
  if (actor.id === profileId) return true;
  return hasRole(actor, "survey_admin");
}

export function canReadProcess(actor: Actor | null): boolean {
  return hasRole(actor, "coordinator");
}

export function canManageAccounts(actor: Actor | null): boolean {
  return hasRole(actor, "tech_admin");
}

export function canGrantRole(actor: Actor | null, targetId: string): boolean {
  return hasRole(actor, "tech_admin") && actor?.id !== targetId;
}

export function canAssignCases(actor: Actor | null): boolean {
  return hasRole(actor, "coordinator");
}

export function canEditPublication(actor: Actor | null): boolean {
  return hasRole(actor, "editor") || hasRole(actor, "coordinator");
}

export function canPublish(actor: Actor | null): boolean {
  return hasRole(actor, "publisher");
}

export interface PublicUpdate {
  id: string;
  slug: string;
  headline: string;
  audience: Audience;
  whatHappened: string;
  whatUnanswered: string;
  followUpRole: string;
  nextUpdateDue: string | null;
  classification: Classification;
  publishedAt: string;
  thisWeek: string;
  stillAwaiting: string;
  actionsFollowed: string;
  driverContribution: string;
  corrections: { note: string; at: string }[];
}

export interface UpdateDraft extends PublicUpdate {
  status: UpdateStatus;
  sourceRecord: string;
  reviewedBy: string;
  editorReviewedBy: string | null;
  approvedBy: string | null;
  internalNote: string;
}

export function toPublicUpdate(row: UpdateDraft): PublicUpdate | null {
  if (row.status !== "published") return null;
  return {
    id: row.id,
    slug: row.slug,
    headline: row.headline,
    audience: row.audience,
    whatHappened: row.whatHappened,
    whatUnanswered: row.whatUnanswered,
    followUpRole: row.followUpRole,
    nextUpdateDue: row.nextUpdateDue,
    classification: row.classification,
    publishedAt: row.publishedAt,
    thisWeek: row.thisWeek,
    stillAwaiting: row.stillAwaiting,
    actionsFollowed: row.actionsFollowed,
    driverContribution: row.driverContribution,
    corrections: row.corrections.map((item) => ({ note: item.note, at: item.at })),
  };
}

export function normaliseText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function containsPrivateWording(publicText: string, privateTexts: string[], window = 40): boolean {
  const haystack = normaliseText(publicText);
  for (const raw of privateTexts) {
    const text = normaliseText(raw);
    if (text.length < window) continue;
    for (let index = 0; index <= text.length - window; index += 5) {
      const slice = text.slice(index, index + window);
      if (haystack.includes(slice)) return true;
    }
  }
  return false;
}

export function assertVerifiedInputs(classification: Classification, source: string, reviewer: string): string | null {
  if (classification !== "verified_fact") return null;
  if (source.trim().length < 8 || reviewer.trim().length < 3) {
    return "A source-checked update needs a recorded source. The reviewer’s identity comes from the signed-in account. A source check is not a legal finding.";
  }
  return null;
}

export function updateDue(status: ActionStatus, targetDate: string, today: string): boolean {
  if (status === "completed" || status === "closed") return false;
  return targetDate < today;
}

export interface PrivacySettings {
  controllerName: string;
  controllerContact: string;
  purposes: string;
  article6Basis: string;
  article9Condition: string;
  processors: string;
  hosting: string;
  transfers: string;
  retention: string;
  rightsProcedure: string;
  breachProcedure: string;
  dpiaAssessment: string;
  coordinatorConfirmedAt: string | null;
  coordinatorConfirmedBy: string | null;
  techConfirmedAt: string | null;
  techConfirmedBy: string | null;
  publishNotice: boolean;
  organisingStartDate: string | null;
}

export function emptyPrivacy(): PrivacySettings {
  return {
    controllerName: "",
    controllerContact: "",
    purposes: "",
    article6Basis: "",
    article9Condition: "",
    processors: "",
    hosting: "",
    transfers: "",
    retention: "",
    rightsProcedure: "",
    breachProcedure: "",
    dpiaAssessment: "",
    coordinatorConfirmedAt: null,
    coordinatorConfirmedBy: null,
    techConfirmedAt: null,
    techConfirmedBy: null,
    publishNotice: false,
    organisingStartDate: null,
  };
}

export function privacyReady(settings: PrivacySettings): boolean {
  if (settings.controllerName.trim().length < 3) return false;
  if (settings.controllerContact.trim().length < 5) return false;
  const decisions = [
    settings.purposes,
    settings.article6Basis,
    settings.article9Condition,
    settings.processors,
    settings.hosting,
    settings.transfers,
    settings.retention,
    settings.rightsProcedure,
    settings.breachProcedure,
    settings.dpiaAssessment,
  ];
  if (decisions.some((item) => item.trim().length < 20)) return false;
  if (!settings.coordinatorConfirmedAt || !settings.techConfirmedAt) return false;
  if (!settings.coordinatorConfirmedBy || !settings.techConfirmedBy) return false;
  if (settings.coordinatorConfirmedBy === settings.techConfirmedBy) return false;
  return true;
}

export function canConfirmPrivacy(
  actor: Actor | null,
  which: "coordinator" | "tech_admin",
  settings: PrivacySettings,
): boolean {
  if (!actor || actor.status !== "active") return false;
  if (which === "coordinator") {
    return hasRole(actor, "coordinator") && settings.techConfirmedBy !== actor.id;
  }
  return hasRole(actor, "tech_admin") && settings.coordinatorConfirmedBy !== actor.id;
}

export interface CountCell {
  label: string;
  count: number | null;
}

export interface SuppressedCount {
  withheld: boolean;
  total: number;
  cells: CountCell[];
  note: string;
}

export function suppressCounts(counts: Record<string, number>, threshold = 5): SuppressedCount {
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total < threshold) {
    return {
      withheld: true,
      total,
      cells: [],
      note: "Fewer than five responses. Results are withheld so people cannot be identified.",
    };
  }
  const small = entries.filter(([, count]) => count < threshold);
  if (small.length === 0) {
    return {
      withheld: false,
      total,
      cells: entries.map(([label, count]) => ({ label, count })),
      note: "",
    };
  }
  const smallTotal = small.reduce((sum, [, count]) => sum + count, 0);
  const large = entries.filter(([, count]) => count >= threshold);
  const canInfer = small.length === 1 || smallTotal < threshold || large.length <= 1;
  if (canInfer) {
    return {
      withheld: true,
      total,
      cells: [],
      note: "Results are withheld because a combination of figures could still identify someone.",
    };
  }
  return {
    withheld: false,
    total,
    cells: entries.map(([label, count]) => ({ label, count: count < threshold ? null : count })),
    note: "Counts below five are hidden.",
  };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createReference(kind: "report" | "action" | "question", year: number, bytes: Uint8Array): string {
  if (bytes.length < 5) throw new Error("weak_random");
  let suffix = "";
  for (let index = 0; index < 5; index += 1) {
    suffix += ALPHABET[(bytes[index] ?? 0) % ALPHABET.length];
  }
  const prefix = kind === "action" ? "DVA" : kind === "question" ? "DVQ" : "DV";
  return `${prefix}-${year}-${suffix}`;
}

export function referenceIsOpaque(reference: string): boolean {
  return /^(DV|DVA|DVQ)-\d{4}-[A-Z2-9]{5}$/.test(reference);
}

export function slugify(headline: string): string {
  const slug = headline
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || "update";
}

export function assertSafeHttpUrl(url: string, origin: string, pathnames: string[]): void {
  const parsed = new URL(url);
  if (parsed.origin !== origin) throw new Error("bad_url");
  if (!pathnames.includes(parsed.pathname)) throw new Error("bad_url");
  if (parsed.search || parsed.hash) throw new Error("bad_url");
}

export interface Mail {
  subject: string;
  text: string;
}

function cleanReference(reference: string): string {
  if (!referenceIsOpaque(reference)) throw new Error("bad_reference");
  return reference;
}

export function acknowledgementEmail(input: { reference: string; signInUrl: string; origin: string }): Mail {
  const reference = cleanReference(input.reference);
  assertSafeHttpUrl(input.signInUrl, input.origin, ["/sign-in"]);
  return {
    subject: `Drivers Voice reference ${reference}`,
    text: [
      `Your submission has been recorded for review.`,
      `Reference: ${reference}`,
      `Sign in to follow its status: ${input.signInUrl}`,
      `This email does not contain your report.`,
      `Recording it here does not mean it has been verified or submitted through an official company, union or statutory procedure.`,
    ].join("\n"),
  };
}

export function infoRequestEmail(input: { reference: string; signInUrl: string; origin: string }): Mail {
  const reference = cleanReference(input.reference);
  assertSafeHttpUrl(input.signInUrl, input.origin, ["/sign-in"]);
  return {
    subject: `Drivers Voice request on ${reference}`,
    text: [
      `There is a request for more information on reference ${reference}.`,
      `Sign in to read it: ${input.signInUrl}`,
      `This email does not include the request or your report.`,
    ].join("\n"),
  };
}

export function statusEmail(input: { reference: string; status: ReportStatus; signInUrl: string; origin: string }): Mail {
  const reference = cleanReference(input.reference);
  assertSafeHttpUrl(input.signInUrl, input.origin, ["/sign-in"]);
  return {
    subject: `Drivers Voice status for ${reference}`,
    text: [
      `The status of ${reference} is now ${input.status.replaceAll("_", " ")}.`,
      `Sign in to view it: ${input.signInUrl}`,
      `This email does not include the report.`,
    ].join("\n"),
  };
}

export function invitationEmail(input: { signInUrl: string; origin: string }): Mail {
  assertSafeHttpUrl(input.signInUrl, input.origin, ["/sign-in"]);
  return {
    subject: "Invitation to Drivers Voice",
    text: [
      "You have been invited to Drivers Voice, an independent driver-led forum.",
      "It is not an official company, union or Workplace Relations Commission system.",
      `Sign in: ${input.signInUrl}`,
      "A coordinator still needs to confirm eligibility. Do not send staff ID photographs, payslips or union membership records merely to join.",
    ].join("\n"),
  };
}

export function actionReminderEmail(input: { reference: string; signInUrl: string; origin: string }): Mail {
  const reference = cleanReference(input.reference);
  assertSafeHttpUrl(input.signInUrl, input.origin, ["/sign-in"]);
  return {
    subject: `Review due for ${reference}`,
    text: [
      `Action ${reference} is due for review.`,
      `Sign in: ${input.signInUrl}`,
      "This reminder does not record a refusal to act.",
    ].join("\n"),
  };
}

export function weeklyUpdateEmail(input: { headline: string; url: string; origin: string }): Mail {
  const headline = input.headline.replace(/\s+/g, " ").trim();
  if (!headline || headline.length > 140 || headline.includes(PRIVATE_SENTENCE)) throw new Error("bad_headline");
  const parsed = new URL(input.url);
  if (parsed.origin !== input.origin) throw new Error("bad_url");
  if (!/^\/updates\/[a-z0-9-]{3,80}$/.test(parsed.pathname)) throw new Error("bad_url");
  if (parsed.search || parsed.hash) throw new Error("bad_url");
  return {
    subject: "Drivers Voice update",
    text: [`An approved update has been published.`, headline, `Read it: ${input.url}`].join("\n"),
  };
}

export const EMAIL_TEMPLATE_NAMES = [
  "invitation",
  "acknowledgement",
  "information_request",
  "status",
  "action_reminder",
  "weekly_update",
] as const;

export function whatsappAnnouncement(input: { headline: string; dateLabel: string; url: string; origin: string }): string {
  const headline = input.headline.replace(/\s+/g, " ").trim();
  if (!headline || headline.length > 140) throw new Error("headline_too_long");
  const parsed = new URL(input.url);
  if (parsed.origin !== input.origin || parsed.search || parsed.hash) throw new Error("bad_url");
  if (!/^\/updates\/[a-z0-9-]{3,80}$/.test(parsed.pathname)) throw new Error("bad_url");
  return [
    "Drivers Voice — approved update",
    headline,
    input.dateLabel,
    `Read it: ${input.url}`,
    "Please do not add unverified claims in replies.",
  ].join("\n");
}

export type DetectedMime = "application/pdf" | "image/jpeg" | "image/png";

export function detectUpload(bytes: Uint8Array, declared: string, size = bytes.length): { ok: true; mime: DetectedMime } | { ok: false; error: string } {
  const limit = 5 * 1024 * 1024;
  if (size <= 0 || size > limit) return { ok: false, error: "Files must be PDF, JPEG or PNG and no larger than 5 MB." };
  let mime: DetectedMime | null = null;
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) mime = "application/pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mime = "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    mime = "image/png";
  }
  if (!mime) return { ok: false, error: "The file content is not a PDF, JPEG or PNG." };
  if (declared !== mime) return { ok: false, error: "The file content does not match its declared type." };
  return { ok: true, mime };
}

export interface StoredFile {
  id: string;
  ownerId: string;
  reportId: string;
  status: "quarantined" | "released";
  scanStatus: "not_scanned" | "clean" | "rejected";
  mime: DetectedMime;
}

export function decideDownload(
  actor: Actor | null,
  file: StoredFile,
  report: { id: string; ownerId: string; status: ReportStatus },
  assignments: AssignmentRef[],
  uploadsConfigured: boolean,
): { allow: boolean; expiresIn: number; reason: string } {
  if (!uploadsConfigured) return { allow: false, expiresIn: 0, reason: "uploads_disabled" };
  if (!canReadReport(actor, report, assignments)) return { allow: false, expiresIn: 0, reason: "not_authorised" };
  if (file.ownerId !== report.ownerId || file.reportId !== report.id) return { allow: false, expiresIn: 0, reason: "not_authorised" };
  if (file.scanStatus !== "clean" || file.status !== "released") return { allow: false, expiresIn: 0, reason: "not_released" };
  return { allow: true, expiresIn: 60, reason: "ok" };
}

export const PLAN_STEPS = [
  { label: "Days 1–3", startOffset: 0, endOffset: 2, text: "Invite participation and committee volunteers." },
  { label: "Days 4–7", startOffset: 3, endOffset: 6, text: "Run the priorities survey and prepare the written process-update request." },
  { label: "Days 8–10", startOffset: 7, endOffset: 9, text: "Review themes and draft measurable priorities." },
  { label: "Days 11–14", startOffset: 10, endOffset: 13, text: "Hold a members’ meeting, record agreed actions and publish an approved update." },
] as const;

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function planSchedule(startDate: string | null): {
  started: boolean;
  steps: { label: string; text: string; from: string | null; to: string | null }[];
} {
  return {
    started: Boolean(startDate),
    steps: PLAN_STEPS.map((step) => ({
      label: step.label,
      text: step.text,
      from: startDate ? addDays(startDate, step.startOffset) : null,
      to: startDate ? addDays(startDate, step.endOffset) : null,
    })),
  };
}

export function resolveMode(env: Record<string, string | undefined>): "demo" | "live" {
  if (env.DRIVERSVOICE_MODE === "demo") return "demo";
  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY) return "live";
  return "demo";
}

export function uploadsConfigured(env: Record<string, string | undefined>, settings: PrivacySettings): boolean {
  return env.UPLOADS_ENABLED === "true" && Boolean(env.SCANNER_WEBHOOK_SECRET) && privacyReady(settings);
}

export function todayIso(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function siteOrigin(env: Record<string, string | undefined> = process.env): string {
  const raw = env.SITE_URL || "https://driversvoice.ie";
  return new URL(raw).origin;
}
