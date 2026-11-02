import { randomBytes, randomUUID } from "crypto";
import { COLLECTION_CLOSED, DEMO_WRITE_BLOCKED, OVERLAP_ERROR, PRIVATE_SENTENCE } from "@/lib/copy";
import {
  type ActionStatus,
  type Actor,
  type AssignmentRef,
  type Audience,
  type Classification,
  type PrivacySettings,
  type PublicUpdate,
  type ReportStatus,
  type Role,
  type UpdateDraft,
  type VerificationStatus,
  canAssignCases,
  canConfirmPrivacy,
  canEditPublication,
  canGrantRole,
  canManageAccounts,
  canPublish,
  canReadNotes,
  canReadProcess,
  canReadReport,
  canReadSurveyResponse,
  containsPrivateWording,
  createReference,
  emptyPrivacy,
  hasRole,
  isAssigned,
  mfaSatisfied,
  privacyReady,
  slugify,
  suppressCounts,
  todayIso,
  toPublicUpdate,
  updateDue,
} from "@/lib/domain";
import type { ActionView, DataStore, ReportCore, Result } from "@/lib/data/types";
import { IDS } from "@/lib/data/ids";
import { TERMS_VERSION } from "@/lib/consent";

const DENIED = "You do not have access to that record.";
const SIGN_IN = "Sign in with an active account to continue.";

interface Options {
  allowCollection?: boolean;
  allowAdminWrites?: boolean;
  collectionFollowsPrivacy?: boolean;
  enforceMfa?: boolean;
  now?: string;
  mode?: "demo" | "live";
}

interface Profile {
  id: string;
  displayName: string;
  status: Actor["status"];
  contactPreference: "account" | "phone" | "email";
  emailUpdates: boolean;
  fictional: boolean;
  mobile: string | null;
  whatsappConsent: boolean;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
}

interface RoleAssignment {
  id: string;
  profileId: string;
  role: Role;
  grantedBy: string | null;
  grantedAt: string;
  revokedAt: string | null;
}

interface ReportRow {
  id: string;
  reference: string;
  kind: "concern" | "incident" | "callback";
  ownerId: string;
  status: ReportStatus;
  category: string;
  title: string;
  eventDate: string;
  eventDateEnd: string | null;
  eventTime: string | null;
  depotContext: string | null;
  routeOrDuty: string | null;
  whatHappened: string;
  personallyObserved: string;
  needsChecking: string;
  effectOnWork: string;
  outcomeRequested: string;
  officialChannel: string | null;
  officialReference: string | null;
  contactMethod: string;
  contactDetail: string | null;
  outstandingIssue: string | null;
  supportRequested: string | null;
  sensitive: boolean;
  idempotencyKey: string;
  createdAt: string;
  submittedAt: string | null;
  responseDue: string | null;
  retentionReviewOn: string | null;
}

interface Assessment {
  reportId: string;
  assessment: string;
  verificationStatus: VerificationStatus;
  verificationSource: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
}

interface Note {
  id: string;
  reportId: string;
  authorId: string;
  body: string;
  at: string;
}

interface InfoRequest {
  id: string;
  reportId: string;
  message: string;
  dueAt: string;
  respondedAt: string | null;
  requestedBy: string;
}

interface Addendum {
  id: string;
  reportId: string;
  authorId: string;
  body: string;
  at: string;
}

interface Summary {
  reportId: string;
  audience: Audience;
  body: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

interface Hold {
  reportId: string;
  reason: string;
  by: string;
}

interface UpdateRow {
  id: string;
  slug: string;
  status: "draft" | "in_review" | "published";
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
  sourceRecord: string;
  reviewedBy: string;
  editorReviewedBy: string | null;
  approvedBy: string | null;
  internalNote: string;
  authorId: string;
}

interface ActionRow {
  id: string;
  reference: string;
  title: string;
  agreedOutcome: string;
  responsibleRole: string;
  dateAgreed: string;
  targetDate: string;
  status: ActionStatus;
  latestUpdate: string;
  nextReviewDate: string;
  publicSummaryDraft: string;
  publicSummaryAuthorId: string | null;
  publicSummary: string | null;
  publicApprovedBy: string | null;
}

interface SurveyResponse {
  profileId: string;
  first: string;
  second: string;
  third: string;
  otherText: string;
  updatedAt: string;
}

interface Volunteer {
  id: string;
  profileId: string;
  name: string;
  contact: string;
  depot: string;
  shiftPattern: string;
  preferredRole: string;
  statement: string;
  consentProfile: boolean;
  approvedProfile: string | null;
  status: string;
}

interface Question {
  id: string;
  reference: string;
  profileId: string | null;
  pageRef: string;
  question: string;
  explanation: string;
  contactPreference: string;
  status: string;
}

interface ProcessRow {
  id: string;
  processType: string;
  referralDate: string;
  referenceNumber: string;
  confirmationSource: string;
  confirmationDate: string;
  requestedInformation: string;
  requestDate: string;
  requestedReplyDate: string;
  responseReceived: string;
  responsibleRole: string;
  nextStep: string;
  reviewDate: string;
}

interface Audit {
  id: string;
  at: string;
  actorId: string;
  category: "account" | "case" | "publication" | "survey" | "settings";
  action: string;
  entityType: string;
  entityId: string;
  fromStatus: string | null;
  toStatus: string | null;
}

interface Priority {
  id: string;
  outcome: string;
  measure: string;
  stage: string;
  lastReview: string;
  agreement: string;
  approvedBy: string;
}

function fail(error: string): Result<never> {
  return { ok: false, error };
}

function blankReport(partial: Pick<ReportRow, "id" | "reference" | "kind" | "ownerId" | "status" | "category" | "title" | "whatHappened"> & Partial<ReportRow>): ReportRow {
  return {
    eventDate: "2026-10-01",
    eventDateEnd: null,
    eventTime: null,
    depotContext: null,
    routeOrDuty: null,
    personallyObserved: "",
    needsChecking: "",
    effectOnWork: "",
    outcomeRequested: "",
    officialChannel: null,
    officialReference: null,
    contactMethod: "account",
    contactDetail: null,
    outstandingIssue: null,
    supportRequested: null,
    sensitive: false,
    idempotencyKey: randomUUID(),
    createdAt: "2026-10-12T09:00:00.000Z",
    submittedAt: null,
    responseDue: null,
    retentionReviewOn: null,
    ...partial,
  };
}

export function createDemoStore(): DataStore {
  return createGovernedStore({ allowCollection: false, allowAdminWrites: false, mode: "demo" });
}

export function createGovernedStore(options: Options = {}): DataStore {
  const allowCollection = options.allowCollection ?? false;
  const allowAdminWrites = options.allowAdminWrites ?? false;
  const followPrivacy = options.collectionFollowsPrivacy ?? false;
  const enforceMfa = options.enforceMfa ?? false;
  const mode = options.mode ?? "demo";
  const now = () => options.now ?? todayIso();

  const profiles: Profile[] = [
    ["driverA", "Alex Brennan (fictional)", "active"],
    ["driverB", "Sam Kehoe (fictional)", "active"],
    ["reviewer", "Jordan Ellis (fictional)", "active"],
    ["coordinator", "Riley Quinn (fictional)", "active"],
    ["editor", "Casey Moore (fictional)", "active"],
    ["publisher", "Morgan Daly (fictional)", "active"],
    ["tech", "Technical administrator (fictional)", "active"],
    ["survey", "Survey administrator (fictional)", "active"],
    ["pending", "Pending driver (fictional)", "pending"],
    ["revoked", "Revoked driver (fictional)", "revoked"],
    ["fixtureC", "Fixture driver (fictional)", "active"],
  ].map(([key, displayName, status]) => ({
    id: IDS[key as keyof typeof IDS],
    displayName,
    status: status as Profile["status"],
    contactPreference: "account" as const,
    emailUpdates: false,
    fictional: true,
    mobile: null,
    whatsappConsent: false,
    termsAcceptedAt: null,
    termsVersion: null,
  }));

  profiles.forEach((profile, index) => {
    if (profile.id === IDS.driverB || profile.id === IDS.pending || profile.id === IDS.revoked) return;
    profile.mobile = `+3538700001${String(index).padStart(2, "0")}`;
    profile.whatsappConsent = true;
    profile.termsAcceptedAt = "2026-10-01T00:00:00.000Z";
    profile.termsVersion = TERMS_VERSION;
  });

  const role = (profile: keyof typeof IDS, assigned: Role, id: string): RoleAssignment => ({
    id,
    profileId: IDS[profile],
    role: assigned,
    grantedBy: null,
    grantedAt: "2026-10-01T00:00:00.000Z",
    revokedAt: null,
  });

  const assignments: RoleAssignment[] = [
    role("driverA", "driver", "20000000-0000-4000-8000-000000000101"),
    role("driverB", "driver", "20000000-0000-4000-8000-000000000102"),
    role("reviewer", "driver", "20000000-0000-4000-8000-000000000103"),
    role("reviewer", "reviewer", "20000000-0000-4000-8000-000000000104"),
    role("coordinator", "driver", "20000000-0000-4000-8000-000000000105"),
    role("coordinator", "coordinator", "20000000-0000-4000-8000-000000000106"),
    role("editor", "driver", "20000000-0000-4000-8000-000000000107"),
    role("editor", "editor", "20000000-0000-4000-8000-000000000108"),
    role("publisher", "driver", "20000000-0000-4000-8000-000000000109"),
    role("publisher", "publisher", "20000000-0000-4000-8000-000000000110"),
    role("tech", "tech_admin", "20000000-0000-4000-8000-000000000111"),
    role("survey", "survey_admin", "20000000-0000-4000-8000-000000000112"),
    role("pending", "driver", "20000000-0000-4000-8000-000000000113"),
    role("revoked", "driver", "20000000-0000-4000-8000-000000000114"),
    role("fixtureC", "driver", "20000000-0000-4000-8000-000000000115"),
  ];

  const reports: ReportRow[] = [
    blankReport({
      id: IDS.reportA,
      reference: "DV-2026-DEMOA",
      kind: "concern",
      ownerId: IDS.driverA,
      status: "under_review",
      category: "Rosters",
      title: "Fictional roster-notice example",
      whatHappened: PRIVATE_SENTENCE,
      personallyObserved: "This fictional account says the driver saw a late roster change.",
      needsChecking: "Whether the fictional notice period was met.",
      effectOnWork: "The fictional duty started before the driver had the change.",
      outcomeRequested: "A written explanation of the fictional notice rule.",
      officialChannel: "no",
      contactMethod: "account",
      eventDate: "2026-10-03",
      submittedAt: "2026-10-12T09:00:00.000Z",
      responseDue: "2026-10-20",
      retentionReviewOn: "2027-10-12",
      idempotencyKey: "00000000-0000-4000-8000-0000000000a1",
    }),
    blankReport({
      id: IDS.reportB,
      reference: "DV-2026-DEMOB",
      kind: "concern",
      ownerId: IDS.driverB,
      status: "received",
      category: "Pay or payroll",
      title: "Fictional payroll-correction example",
      whatHappened: "A fictional note that a late finish was not on the payslip.",
      personallyObserved: "The fictional driver compared a duty finish with a payslip line.",
      needsChecking: "Whether the fictional payment was later corrected.",
      effectOnWork: "The fictional pay for that duty was short.",
      outcomeRequested: "A check of the fictional pay line.",
      officialChannel: "yes",
      officialReference: "EXAMPLE-REF",
      eventDate: "2026-09-18",
      submittedAt: "2026-10-02T09:00:00.000Z",
      responseDue: "2026-10-09",
      retentionReviewOn: "2026-10-01",
      idempotencyKey: "00000000-0000-4000-8000-0000000000b2",
    }),
    blankReport({
      id: IDS.draftA,
      reference: "DV-2026-DEMOD",
      kind: "concern",
      ownerId: IDS.driverA,
      status: "draft",
      category: "Communication",
      title: "Fictional draft, not submitted",
      whatHappened: "A fictional unfinished draft that the committee must not see.",
      personallyObserved: "Draft observation.",
      needsChecking: "Not submitted.",
      effectOnWork: "None yet.",
      outcomeRequested: "None yet.",
      idempotencyKey: "00000000-0000-4000-8000-0000000000d3",
    }),
  ];

  const assessments: Assessment[] = reports.map((report) => ({
    reportId: report.id,
    assessment: report.id === IDS.reportA ? "Fictional assessment: the account is specific enough to ask a follow-up. It is not verified." : "",
    verificationStatus: "unverified",
    verificationSource: null,
    verifiedBy: null,
    verifiedAt: null,
  }));

  const caseAssignments: { id: string; reportId: string; assigneeId: string; removedAt: string | null }[] = [
    { id: IDS.assignReviewer, reportId: IDS.reportA, assigneeId: IDS.reviewer, removedAt: null },
  ];

  const notes: Note[] = [
    {
      id: IDS.noteA,
      reportId: IDS.reportA,
      authorId: IDS.reviewer,
      body: "Internal committee note. Not for the driver view or any public page.",
      at: "2026-10-13T10:00:00.000Z",
    },
  ];

  const infoRequests: InfoRequest[] = [
    {
      id: IDS.infoA,
      reportId: IDS.reportA,
      message: "Fictional request: please add the duty date you already know. Do not send a payslip.",
      dueAt: "2026-10-28",
      respondedAt: null,
      requestedBy: IDS.reviewer,
    },
  ];

  const addenda: Addendum[] = [];
  const summaries: Summary[] = [
    {
      reportId: IDS.reportA,
      audience: "members",
      body: "A fictional example of an approved member summary. It does not describe a real dispute.",
      approvedBy: IDS.publisher,
      approvedAt: "2026-10-14T00:00:00.000Z",
    },
  ];
  const holds: Hold[] = [];

  const sample = (id: string, slug: string, audience: Audience, status: UpdateRow["status"]): UpdateRow => ({
    id,
    slug,
    status,
    headline: audience === "public" ? "How an approved update will be set out" : "How a member update will be set out",
    audience,
    whatHappened: "This sample shows the fields an approved update uses. It does not describe a real event, claim or negotiation.",
    whatUnanswered: "No real question is recorded here.",
    followUpRole: "Communications lead (proposed role)",
    nextUpdateDue: "2026-11-15",
    classification: "proposal",
    publishedAt: status === "published" ? "2026-10-20T12:00:00.000Z" : "",
    thisWeek: "This sample shows how a weekly note will be structured.",
    stillAwaiting: "Nothing real is awaiting an answer in this sample.",
    actionsFollowed: "No real action is recorded in this sample.",
    driverContribution: "Drivers can read the working plan and, once collection is open, use the private forms.",
    corrections: [],
    sourceRecord: "",
    reviewedBy: "",
    editorReviewedBy: status === "draft" ? null : IDS.editor,
    approvedBy: status === "published" ? IDS.publisher : null,
    internalNote: "KEEP-INTERNAL-NOTE-77",
    authorId: IDS.editor,
  });

  const updates: UpdateRow[] = [
    sample(IDS.updatePublic, "how-an-approved-update-will-be-set-out", "public", "published"),
    sample(IDS.updateMember, "how-a-member-update-will-be-set-out", "members", "published"),
    { ...sample(IDS.updateReview, "sample-awaiting-publication", "public", "in_review"), headline: "Sample draft awaiting publication approval" },
    { ...sample(IDS.updateDraft, "sample-editorial-draft", "members", "draft"), headline: "Sample editorial draft", editorReviewedBy: null },
  ];

  const actions: ActionRow[] = [
    {
      id: IDS.actionA,
      reference: "DVA-2026-DEMOA",
      title: "Fictional follow-up on roster notice",
      agreedOutcome: "Ask for the written notice rule that applies to roster changes.",
      responsibleRole: "Union liaison (proposed role)",
      dateAgreed: "2026-10-10",
      targetDate: "2026-10-01",
      status: "in_progress",
      latestUpdate: "This fictional action is waiting for a review date to be recorded.",
      nextReviewDate: "2026-11-08",
      publicSummaryDraft: "",
      publicSummaryAuthorId: null,
      publicSummary: null,
      publicApprovedBy: null,
    },
  ];

  const surveyResponses: SurveyResponse[] = [
    { profileId: IDS.driverA, first: "Rosters", second: "Basic pay", third: "Communication", otherText: "", updatedAt: "2026-10-05T00:00:00.000Z" },
    { profileId: IDS.driverB, first: "Basic pay", second: "Rosters", third: "Overtime and payroll accuracy", otherText: "", updatedAt: "2026-10-06T00:00:00.000Z" },
    { profileId: IDS.fixtureC, first: "Other", second: "Breaks and facilities", third: "Communication", otherText: "Fictional other priority that must not be published.", updatedAt: "2026-10-07T00:00:00.000Z" },
  ];

  const volunteers: Volunteer[] = [
    {
      id: IDS.volunteer,
      profileId: IDS.driverA,
      name: "Alex Brennan (fictional)",
      contact: "fictional-contact-not-for-publication",
      depot: "Example depot grouping",
      shiftPattern: "Early and middle",
      preferredRole: "Communications lead",
      statement: "A fictional volunteer statement. This person has not been appointed.",
      consentProfile: true,
      approvedProfile: null,
      status: "received",
    },
  ];

  const questions: Question[] = [
    {
      id: IDS.question,
      reference: "DVQ-2026-DEMOA",
      profileId: IDS.driverB,
      pageRef: "Our working plan",
      question: "Fictional question about where approved updates will appear.",
      explanation: "This is sample text for the private question queue.",
      contactPreference: "account",
      status: "received",
    },
  ];

  const processes: ProcessRow[] = [
    {
      id: IDS.process,
      processType: "Not confirmed",
      referralDate: "",
      referenceNumber: "",
      confirmationSource: "",
      confirmationDate: "",
      requestedInformation: "Referral date, reference where available, claims submitted, current stage, relevant dates and next steps.",
      requestDate: "",
      requestedReplyDate: "",
      responseReceived: "",
      responsibleRole: "Union liaison (proposed role)",
      nextStep: "No request has been sent. This row is a fictional empty tracker.",
      reviewDate: "",
    },
  ];

  const audits: Audit[] = [
    {
      id: "30000000-0000-4000-8000-000000000001",
      at: "2026-10-12T09:00:00.000Z",
      actorId: IDS.driverA,
      category: "case",
      action: "report_submitted",
      entityType: "report",
      entityId: IDS.reportA,
      fromStatus: "draft",
      toStatus: "received",
    },
  ];

  const priorities: Priority[] = [];
  const invitations: { id: string; email: string; invitedBy: string; createdAt: string }[] = [];
  let settings: PrivacySettings = emptyPrivacy();
  const surveyCloses = "2027-12-31";

  function stamp(): string {
    return `${now()}T12:00:00.000Z`;
  }

  function resolve(presented: Actor | null): Actor | null {
    if (!presented) return null;
    const profile = profiles.find((item) => item.id === presented.id);
    if (!profile) return null;
    const roles = assignments.filter((item) => item.profileId === profile.id && !item.revokedAt).map((item) => item.role);
    return { id: profile.id, displayName: profile.displayName, status: profile.status, roles, mfa: presented.mfa };
  }

  function actorFromId(id: string): Actor | null {
    const profile = profiles.find((item) => item.id === id);
    if (!profile) return null;
    const roles = assignments.filter((item) => item.profileId === id && !item.revokedAt).map((item) => item.role);
    return { id, displayName: profile.displayName, status: profile.status, roles, mfa: "aal1" };
  }

  function nameOf(id: string): string {
    return profiles.find((item) => item.id === id)?.displayName ?? "Driver";
  }

  function assignmentRefs(): AssignmentRef[] {
    return caseAssignments.map((item) => ({ reportId: item.reportId, assigneeId: item.assigneeId, removedAt: item.removedAt }));
  }

  function privateTexts(): string[] {
    return [
      ...reports.flatMap((report) => [report.whatHappened, report.personallyObserved, report.needsChecking, report.effectOnWork, report.outcomeRequested, report.outstandingIssue ?? "", report.supportRequested ?? ""]),
      ...notes.map((note) => note.body),
      ...addenda.map((item) => item.body),
      ...infoRequests.map((item) => item.message),
      ...volunteers.map((item) => item.contact),
      ...surveyResponses.map((item) => item.otherText),
    ].filter(Boolean);
  }

  function audit(actor: Actor, category: Audit["category"], action: string, entityType: string, entityId: string, fromStatus: string | null, toStatus: string | null) {
    audits.push({ id: randomUUID(), at: stamp(), actorId: actor.id, category, action, entityType, entityId, fromStatus, toStatus });
  }

  function collectionOpen(): boolean {
    if (!allowCollection) return false;
    if (followPrivacy) return privacyReady(settings);
    return true;
  }

  function requireCollection(): Result<never> | null {
    if (collectionOpen()) return null;
    return fail(allowCollection ? COLLECTION_CLOSED : DEMO_WRITE_BLOCKED);
  }

  function requireAdmin(): Result<never> | null {
    if (allowAdminWrites) return null;
    return fail(DEMO_WRITE_BLOCKED);
  }

  function privileged(actor: Actor): Result<never> | null {
    if (mfaSatisfied(actor, enforceMfa)) return null;
    return fail("Multi-factor authentication is required for this action.");
  }

  function active(presented: Actor | null): Actor | Result<never> {
    const actor = resolve(presented);
    if (!actor || actor.status !== "active") return fail(SIGN_IN);
    return actor;
  }

  function refsFor(reportId: string): AssignmentRef[] {
    return assignmentRefs().filter((item) => item.reportId === reportId);
  }

  function asDraft(row: UpdateRow): UpdateDraft {
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
      corrections: row.corrections,
      status: row.status,
      sourceRecord: row.sourceRecord,
      reviewedBy: row.reviewedBy,
      editorReviewedBy: row.editorReviewedBy,
      approvedBy: row.approvedBy,
      internalNote: row.internalNote,
    };
  }

  function publicOf(row: UpdateRow): PublicUpdate | null {
    const projected = toPublicUpdate(asDraft(row));
    if (!projected || row.audience !== "public") return null;
    return projected;
  }

  function projectCore(report: ReportRow): ReportCore {
    const assessment = assessments.find((item) => item.reportId === report.id);
    const summary = summaries.find((item) => item.reportId === report.id && item.audience === "members" && item.approvedAt);
    return {
      id: report.id,
      reference: report.reference,
      kind: report.kind,
      status: report.status,
      category: report.category,
      title: report.title,
      eventDate: report.eventDate,
      eventDateEnd: report.eventDateEnd,
      eventTime: report.eventTime,
      depotContext: report.depotContext,
      routeOrDuty: report.routeOrDuty,
      whatHappened: report.whatHappened,
      personallyObserved: report.personallyObserved,
      needsChecking: report.needsChecking,
      effectOnWork: report.effectOnWork,
      outcomeRequested: report.outcomeRequested,
      officialChannel: report.officialChannel,
      officialReference: report.officialReference,
      contactMethod: report.contactMethod,
      contactDetail: report.contactDetail,
      outstandingIssue: report.outstandingIssue,
      supportRequested: report.supportRequested,
      sensitive: report.sensitive,
      submittedAt: report.submittedAt,
      verificationStatus: assessment?.verificationStatus ?? "unverified",
      events: audits
        .filter((item) => item.entityId === report.id && item.category === "case")
        .map((item) => ({ at: item.at, label: item.action.replaceAll("_", " ") })),
      infoRequests: infoRequests
        .filter((item) => item.reportId === report.id)
        .map((item) => ({ id: item.id, message: item.message, dueAt: item.dueAt, respondedAt: item.respondedAt })),
      addenda: addenda.filter((item) => item.reportId === report.id).map((item) => ({ at: item.at, body: item.body })),
      memberSummary: summary?.body ?? null,
    };
  }

  function actionView(row: ActionRow): ActionView {
    return {
      id: row.id,
      reference: row.reference,
      title: row.title,
      agreedOutcome: row.agreedOutcome,
      responsibleRole: row.responsibleRole,
      dateAgreed: row.dateAgreed,
      targetDate: row.targetDate,
      status: row.status,
      latestUpdate: row.latestUpdate,
      nextReviewDate: row.nextReviewDate,
      updateDue: updateDue(row.status, row.targetDate, now()),
      visibility: row.publicApprovedBy ? "public" : "members",
      publicSummary: row.publicSummary,
    };
  }

  function surveyNote(): string {
    const counts: Record<string, number> = {};
    for (const response of surveyResponses) {
      counts[response.first] = (counts[response.first] ?? 0) + 1;
    }
    return suppressCounts(counts).note || "Approved totals will appear here after publication.";
  }

  const store: DataStore = {
    mode,
    get submissionsOpen() {
      return collectionOpen();
    },
    uploadsOpen: false,
    acceptsAdminWrites: allowAdminWrites,
    async collectionState() {
      return collectionOpen();
    },
    async actorById(id) {
      return actorFromId(id);
    },
    async listPublicUpdates() {
      return updates.flatMap((row) => {
        const item = publicOf(row);
        return item ? [item] : [];
      });
    },
    async getPublicUpdate(slug) {
      const row = updates.find((item) => item.slug === slug);
      return row ? publicOf(row) : null;
    },
    async listAgreedPriorities() {
      return priorities.map((item) => ({ id: item.id, outcome: item.outcome, measure: item.measure, stage: item.stage, lastReview: item.lastReview, agreement: item.agreement }));
    },
    async getOrganisingStartDate() {
      return settings.organisingStartDate;
    },
    async getPublicPrivacy() {
      if (!settings.publishNotice || !privacyReady(settings)) return null;
      const { controllerName, controllerContact, purposes, article6Basis, article9Condition, processors, hosting, transfers, retention, rightsProcedure, breachProcedure, dpiaAssessment } = settings;
      return { controllerName, controllerContact, purposes, article6Basis, article9Condition, processors, hosting, transfers, retention, rightsProcedure, breachProcedure, dpiaAssessment };
    },
    async listPublicActionSummaries() {
      return actions.filter((item) => item.publicApprovedBy && item.publicSummary).map((item) => ({ reference: item.reference, summary: item.publicSummary ?? "" }));
    },
    async dashboard(presented) {
      const actor = resolve(presented);
      if (!actor || actor.status !== "active" || !hasRole(actor, "driver")) return null;
      const own = reports.filter((report) => report.ownerId === actor.id);
      return {
        reports: own.map((report) => ({ id: report.id, reference: report.reference, title: report.title, status: report.status, kind: report.kind })),
        infoRequests: infoRequests
          .filter((item) => !item.respondedAt && own.some((report) => report.id === item.reportId))
          .map((item) => ({ id: item.id, reportId: item.reportId, reference: reports.find((report) => report.id === item.reportId)?.reference ?? "", message: item.message, dueAt: item.dueAt })),
        survey: (await store.surveyState(actor)) ?? { open: false, closesAt: surveyCloses, response: null, aggregateNote: "" },
        actions: await store.listActions(actor),
        updates: updates.flatMap((row) => {
          const projected = toPublicUpdate(asDraft(row));
          return projected && (row.audience === "public" || row.audience === "members") ? [projected] : [];
        }),
        nextReview: actions.map((item) => item.nextReviewDate).sort()[0] ?? null,
      };
    },
    async getReport(presented, id) {
      const actor = resolve(presented);
      const report = reports.find((item) => item.id === id);
      if (!report || !canReadReport(actor, report, assignmentRefs())) return null;
      const core = projectCore(report);
      if (!canReadNotes(actor, report, assignmentRefs())) return { kind: "owner", report: core };
      const assessment = assessments.find((item) => item.reportId === id);
      return {
        kind: "committee",
        report: {
          ...core,
          ownerId: report.ownerId,
          ownerName: nameOf(report.ownerId),
          assessment: assessment?.assessment ?? "",
          verificationSource: assessment?.verificationSource ?? null,
          verifiedBy: assessment?.verifiedBy ? nameOf(assessment.verifiedBy) : null,
          notes: notes.filter((item) => item.reportId === id).map((item) => ({ id: item.id, at: item.at, body: item.body, authorName: nameOf(item.authorId) })),
          assignees: caseAssignments.filter((item) => item.reportId === id && !item.removedAt).map((item) => ({ id: item.assigneeId, name: nameOf(item.assigneeId) })),
          publicSummary: summaries.find((item) => item.reportId === id && item.audience === "public")?.body ?? null,
          legalHold: holds.some((item) => item.reportId === id),
        },
      };
    },
    async getMemberUpdate(presented, slug) {
      const actor = resolve(presented);
      if (!actor || actor.status !== "active" || !hasRole(actor, "driver")) return null;
      const row = updates.find((item) => item.slug === slug && item.status === "published" && (item.audience === "members" || item.audience === "public"));
      return row ? toPublicUpdate(asDraft(row)) : null;
    },
    async listActions(presented) {
      const actor = resolve(presented);
      if (!actor || actor.status !== "active" || !hasRole(actor, "driver")) return [];
      return actions.map((item) => actionView(item));
    },
    async surveyState(presented) {
      const actor = resolve(presented);
      if (!actor || !canReadSurveyResponse(actor, actor.id) || !hasRole(actor, "driver")) return null;
      const response = surveyResponses.find((item) => item.profileId === actor.id) ?? null;
      return {
        open: now() <= surveyCloses,
        closesAt: surveyCloses,
        response: response ? { first: response.first, second: response.second, third: response.third, otherText: response.otherText } : null,
        aggregateNote: surveyNote(),
      };
    },
    async adminOverview(presented) {
      const actor = resolve(presented);
      if (!actor || actor.status !== "active") return null;
      const seesCases = hasRole(actor, "coordinator") || hasRole(actor, "reviewer");
      const queue = seesCases ? await store.listQueue(actor, {}) : [];
      return {
        queue: queue.length,
        drafts: hasRole(actor, "editor") || hasRole(actor, "coordinator") ? updates.filter((item) => item.status === "draft").length : 0,
        awaitingPublication: hasRole(actor, "publisher") ? updates.filter((item) => item.status === "in_review").length : 0,
        questions: hasRole(actor, "coordinator") ? questions.length : 0,
        volunteers: hasRole(actor, "coordinator") ? volunteers.length : 0,
        retentionDue: hasRole(actor, "coordinator")
          ? reports.filter((item) => item.retentionReviewOn && item.retentionReviewOn <= now() && item.status !== "draft").map((item) => ({ reference: item.reference, reviewOn: item.retentionReviewOn ?? "" }))
          : [],
        reviewsDue: hasRole(actor, "coordinator")
          ? actions.filter((item) => updateDue(item.status, item.targetDate, now()) || item.nextReviewDate <= now()).map((item) => ({ reference: item.reference, nextReviewDate: item.nextReviewDate }))
          : [],
        canSeeReportContent: hasRole(actor, "coordinator") || hasRole(actor, "reviewer"),
      };
    },
    async listQueue(presented, filter) {
      const actor = resolve(presented);
      if (!actor) return [];
      return reports
        .filter((report) => report.status !== "draft" && canReadReport(actor, report, assignmentRefs()))
        .filter((report) => (filter.status ? report.status === filter.status : true))
        .filter((report) => (filter.category ? report.category === filter.category : true))
        .map((report) => ({
          id: report.id,
          reference: report.reference,
          title: report.title,
          category: report.category,
          status: report.status,
          ownerName: nameOf(report.ownerId),
          submittedAt: report.submittedAt,
          assigneeNames: caseAssignments.filter((item) => item.reportId === report.id && !item.removedAt).map((item) => nameOf(item.assigneeId)),
          updateDue: Boolean(report.responseDue && report.responseDue < now() && report.status !== "resolved" && report.status !== "closed"),
        }));
    },
    async listVolunteers(presented) {
      const actor = resolve(presented);
      if (!hasRole(actor, "coordinator")) return [];
      return volunteers.map((item) => ({ ...item, consentProfile: item.consentProfile }));
    },
    async listQuestions(presented) {
      const actor = resolve(presented);
      if (!hasRole(actor, "coordinator")) return [];
      return questions.map((item) => ({ ...item }));
    },
    async listOwnQuestions(presented) {
      const actor = resolve(presented);
      if (!actor || actor.status !== "active") return [];
      return questions.filter((item) => item.profileId === actor.id).map((item) => ({ id: item.id, reference: item.reference, pageRef: item.pageRef, question: item.question, status: item.status }));
    },
    async listProcess(presented) {
      const actor = resolve(presented);
      if (!canReadProcess(actor)) return [];
      return processes.map((item) => ({ ...item }));
    },
    async listMembers(presented) {
      const actor = resolve(presented);
      if (!actor || (!hasRole(actor, "tech_admin") && !hasRole(actor, "coordinator"))) return [];
      return profiles.map((profile) => ({
        id: profile.id,
        displayName: profile.displayName,
        status: profile.status,
        roles: assignments.filter((item) => item.profileId === profile.id && !item.revokedAt).map((item) => item.role),
        fictional: profile.fictional,
        mobile: profile.mobile,
        whatsappConsent: profile.whatsappConsent,
        termsAcceptedAt: profile.termsAcceptedAt,
      }));
    },
    async signupState(presented) {
      const actor = resolve(presented);
      if (!actor) return null;
      const profile = profiles.find((item) => item.id === actor.id);
      if (!profile) return null;
      return {
        mobile: profile.mobile,
        whatsappConsent: profile.whatsappConsent,
        termsAcceptedAt: profile.termsAcceptedAt,
        termsVersion: profile.termsVersion,
      };
    },
    async listAudit(presented) {
      const actor = resolve(presented);
      if (!actor || actor.status !== "active") return [];
      return audits
        .filter((item) => {
          if (hasRole(actor, "tech_admin") && !hasRole(actor, "coordinator")) return item.category === "account";
          if (hasRole(actor, "coordinator")) return item.category !== "account" || hasRole(actor, "tech_admin");
          if (hasRole(actor, "reviewer")) {
            return item.category === "case" && isAssigned(assignmentRefs(), item.entityId, actor.id);
          }
          if (hasRole(actor, "editor") || hasRole(actor, "publisher")) return item.category === "publication";
          if (hasRole(actor, "survey_admin")) return item.category === "survey";
          return false;
        })
        .map((item) => ({ id: item.id, at: item.at, action: item.action, entityType: item.entityType, entityId: item.entityId, fromStatus: item.fromStatus, toStatus: item.toStatus }));
    },
    async settingsFor(presented) {
      const actor = resolve(presented);
      if (!actor || (!hasRole(actor, "coordinator") && !hasRole(actor, "tech_admin"))) return null;
      return {
        settings: { ...settings },
        ready: privacyReady(settings),
        canEdit: allowAdminWrites,
        canConfirmCoordinator: canConfirmPrivacy(actor, "coordinator", settings),
        canConfirmTech: canConfirmPrivacy(actor, "tech_admin", settings),
      };
    },
    async listUpdateDrafts(presented) {
      const actor = resolve(presented);
      if (!actor || (!hasRole(actor, "editor") && !hasRole(actor, "publisher") && !hasRole(actor, "coordinator"))) return [];
      return updates.map((row) => ({ ...(toPublicUpdate({ ...asDraft(row), status: "published" }) as PublicUpdate), status: row.status, sourceRecord: row.sourceRecord, reviewedBy: row.reviewedBy, internalNote: row.internalNote, editorReviewedBy: row.editorReviewedBy, publishedAt: row.publishedAt }));
    },
    async surveyAdmin(presented) {
      const actor = resolve(presented);
      if (!hasRole(actor, "survey_admin")) return null;
      const counts: Record<string, number> = {};
      for (const response of surveyResponses) counts[response.first] = (counts[response.first] ?? 0) + 1;
      const suppressed = suppressCounts(counts);
      return {
        responses: surveyResponses.map((item) => ({ profileName: nameOf(item.profileId), first: item.first, second: item.second, third: item.third, otherText: item.otherText })),
        aggregateNote: suppressed.note,
        withheld: suppressed.withheld,
      };
    },
    async publicVolunteerProfiles() {
      return volunteers.filter((item) => item.consentProfile && item.approvedProfile).map((item) => ({ name: item.name, statement: item.approvedProfile ?? "" }));
    },
    async saveConcern(presented, input) {
      const blocked = requireCollection();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      if (!hasRole(actor, "driver") || input.acknowledgement !== "yes") return fail(DENIED);
      const existing = reports.find((item) => item.idempotencyKey === input.idempotencyKey && item.ownerId === actor.id);
      if (existing) return { ok: true, data: { id: existing.id, reference: existing.reference, status: existing.status } };
      const status: ReportStatus = input.intent === "draft" ? "draft" : "received";
      const report = blankReport({
        id: randomUUID(),
        reference: createReference("report", Number(now().slice(0, 4)), randomBytes(5)),
        kind: "concern",
        ownerId: actor.id,
        status,
        category: input.category,
        title: input.title,
        whatHappened: input.whatHappened,
        personallyObserved: input.personallyObserved,
        needsChecking: input.needsChecking,
        effectOnWork: input.effectOnWork,
        outcomeRequested: input.outcomeRequested,
        eventDate: input.eventDate,
        eventDateEnd: input.eventDateEnd || null,
        depotContext: input.depotContext || null,
        officialChannel: input.officialChannelUsed,
        officialReference: input.officialReference || null,
        contactMethod: input.contactMethod,
        contactDetail: input.contactDetail || null,
        idempotencyKey: input.idempotencyKey,
        submittedAt: status === "received" ? stamp() : null,
        responseDue: status === "received" ? now() : null,
        createdAt: stamp(),
      });
      reports.push(report);
      assessments.push({ reportId: report.id, assessment: "", verificationStatus: "unverified", verificationSource: null, verifiedBy: null, verifiedAt: null });
      audit(actor, "case", status === "draft" ? "report_draft_saved" : "report_submitted", "report", report.id, null, status);
      return { ok: true, data: { id: report.id, reference: report.reference, status } };
    },
    async saveIncident(presented, input) {
      const blocked = requireCollection();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      if (!hasRole(actor, "driver") || input.acknowledgement !== "yes") return fail(DENIED);
      const sensitive = input.category === "Injury or welfare" || input.category === "Disciplinary" || input.category === "Third-party matter";
      const existing = reports.find((item) => item.idempotencyKey === input.idempotencyKey && item.ownerId === actor.id);
      if (existing) return { ok: true, data: { id: existing.id, reference: existing.reference, status: existing.status } };
      const status: ReportStatus = input.intent === "draft" ? "draft" : "received";
      const report = blankReport({
        id: randomUUID(),
        reference: createReference("report", Number(now().slice(0, 4)), randomBytes(5)),
        kind: sensitive ? "callback" : "incident",
        ownerId: actor.id,
        status,
        category: input.category,
        title: sensitive ? "Callback request" : `${input.category} follow-up`,
        whatHappened: sensitive ? "" : input.summary || "",
        outstandingIssue: sensitive ? "" : input.outstanding || "",
        supportRequested: input.supportRequested || "",
        sensitive,
        eventDate: input.eventDate,
        eventTime: input.eventTime || null,
        routeOrDuty: sensitive ? null : input.routeOrDuty || null,
        officialChannel: input.officialChannelUsed,
        officialReference: input.officialReference || null,
        contactMethod: input.contactMethod,
        contactDetail: input.contactDetail || null,
        idempotencyKey: input.idempotencyKey,
        submittedAt: status === "received" ? stamp() : null,
        createdAt: stamp(),
      });
      reports.push(report);
      assessments.push({ reportId: report.id, assessment: "", verificationStatus: "unverified", verificationSource: null, verifiedBy: null, verifiedAt: null });
      audit(actor, "case", "report_submitted", "report", report.id, null, status);
      return { ok: true, data: { id: report.id, reference: report.reference, status } };
    },
    async respondToInfo(presented, input) {
      const blocked = requireCollection();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const request = infoRequests.find((item) => item.id === input.requestId);
      const report = reports.find((item) => item.id === request?.reportId);
      if (!request || !report || report.ownerId !== actor.id) return fail(DENIED);
      const original = report.whatHappened;
      request.respondedAt = stamp();
      addenda.push({ id: randomUUID(), reportId: report.id, authorId: actor.id, body: input.body, at: stamp() });
      if (report.whatHappened !== original) return fail("The original account was left unchanged.");
      audit(actor, "case", "information_added", "report", report.id, report.status, report.status);
      return { ok: true, data: { saved: true } };
    },
    async requestChange(presented, input) {
      const blocked = requireCollection();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const report = reports.find((item) => item.id === input.reportId);
      if (!report || report.ownerId !== actor.id) return fail(DENIED);
      const original = report.whatHappened;
      questions.push({
        id: randomUUID(),
        reference: createReference("question", Number(now().slice(0, 4)), randomBytes(5)),
        profileId: actor.id,
        pageRef: report.reference,
        question: input.kind === "closure" ? "Closure requested" : "Correction requested",
        explanation: input.message,
        contactPreference: "account",
        status: "received",
      });
      audit(actor, "case", input.kind === "closure" ? "closure_requested" : "correction_requested", "report", report.id, report.status, report.status);
      if (report.whatHappened !== original) return fail("The original account was left unchanged.");
      return { ok: true, data: { saved: true } };
    },
    async saveSurvey(presented, input) {
      const blocked = requireCollection();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      if (!hasRole(actor, "driver")) return fail(DENIED);
      if (now() > surveyCloses) return fail("The survey is closed.");
      const current = surveyResponses.find((item) => item.profileId === actor.id);
      const next = { profileId: actor.id, first: input.first, second: input.second, third: input.third, otherText: input.otherText || "", updatedAt: stamp() };
      if (current) Object.assign(current, next);
      else surveyResponses.push(next);
      audit(actor, "survey", "survey_saved", "survey", IDS.surveyPeriod, null, null);
      return { ok: true, data: { saved: true } };
    },
    async saveVolunteer(presented, input) {
      const blocked = requireCollection();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      volunteers.push({
        id: randomUUID(),
        profileId: actor.id,
        name: input.name,
        contact: input.contact,
        depot: input.depot || "",
        shiftPattern: input.shiftPattern || "",
        preferredRole: input.preferredRole,
        statement: input.statement,
        consentProfile: input.consentProfile === "yes",
        approvedProfile: null,
        status: "received",
      });
      audit(actor, "account", "volunteer_received", "volunteer", actor.id, null, "received");
      return { ok: true, data: { saved: true } };
    },
    async saveQuestion(presented, input) {
      const blocked = requireCollection();
      if (blocked) return blocked;
      if (input.companyWebsite) return fail("The form could not be accepted.");
      const actor = resolve(presented);
      if (actor && actor.status !== "active" && actor.status !== "pending") return fail(SIGN_IN);
      const reference = createReference("question", Number(now().slice(0, 4)), randomBytes(5));
      questions.push({
        id: randomUUID(),
        reference,
        profileId: actor?.id ?? null,
        pageRef: input.pageRef,
        question: input.question,
        explanation: input.explanation,
        contactPreference: input.contactPreference || "",
        status: "received",
      });
      if (actor) audit(actor, "case", "question_received", "question", reference, null, "received");
      return { ok: true, data: { reference } };
    },
    async addNote(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      const report = reports.find((item) => item.id === input.reportId);
      if (!report || !canReadNotes(actor, report, assignmentRefs())) return fail(DENIED);
      notes.push({ id: randomUUID(), reportId: report.id, authorId: actor.id, body: input.body, at: stamp() });
      audit(actor, "case", "note_added", "report", report.id, null, null);
      return { ok: true, data: { saved: true } };
    },
    async assignReport(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!canAssignCases(actor)) return fail(DENIED);
      const report = reports.find((item) => item.id === input.reportId);
      const assignee = actorFromId(input.assigneeId);
      if (!report || report.status === "draft" || !assignee || !hasRole(assignee, "reviewer")) return fail("Choose an active reviewer. Drafts stay with the driver.");
      caseAssignments.push({ id: randomUUID(), reportId: report.id, assigneeId: assignee.id, removedAt: null });
      audit(actor, "case", "reviewer_assigned", "report", report.id, null, "assigned");
      return { ok: true, data: { saved: true } };
    },
    async transitionReport(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      const report = reports.find((item) => item.id === input.reportId);
      if (!report || !canReadNotes(actor, report, refsFor(report.id))) return fail(DENIED);
      if (input.status === "draft") return fail(DENIED);
      const from = report.status;
      report.status = input.status;
      audit(actor, "case", "status_changed", "report", report.id, from, input.status);
      return { ok: true, data: { saved: true } };
    },
    async setVerification(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      const report = reports.find((item) => item.id === input.reportId);
      const assessment = assessments.find((item) => item.reportId === input.reportId);
      if (!report || !assessment || !canReadNotes(actor, report, refsFor(report.id))) return fail(DENIED);
      if (input.status === "verified" && input.source.trim().length < 8) return fail("A source check needs the source, the point checked and its limits. The reviewer’s account is recorded automatically. A source check is not a legal finding.");
      assessment.verificationStatus = input.status;
      assessment.verificationSource = input.status === "verified" ? input.source.trim() : null;
      assessment.verifiedBy = input.status === "verified" ? actor.id : null;
      assessment.verifiedAt = input.status === "verified" ? stamp() : null;
      audit(actor, "case", "verification_set", "report", report.id, null, input.status);
      return { ok: true, data: { saved: true } };
    },
    async requestInfo(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      const report = reports.find((item) => item.id === input.reportId);
      if (!report || !canReadNotes(actor, report, refsFor(report.id))) return fail(DENIED);
      infoRequests.push({ id: randomUUID(), reportId: report.id, message: input.message, dueAt: now(), respondedAt: null, requestedBy: actor.id });
      const from = report.status;
      report.status = "more_information_needed";
      audit(actor, "case", "information_requested", "report", report.id, from, report.status);
      return { ok: true, data: { saved: true } };
    },
    async saveSummary(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      const summaryReport = reports.find((item) => item.id === input.reportId);
      if (!summaryReport) return fail(DENIED);
      if (!canEditPublication(actor) && !canReadNotes(actor, summaryReport, refsFor(input.reportId))) return fail(DENIED);
      if (containsPrivateWording(input.body, privateTexts())) return fail(OVERLAP_ERROR);
      const current = summaries.find((item) => item.reportId === input.reportId && item.audience === input.audience);
      if (current) {
        current.body = input.body;
        current.approvedBy = null;
        current.approvedAt = null;
      } else {
        summaries.push({ reportId: input.reportId, audience: input.audience, body: input.body, approvedBy: null, approvedAt: null });
      }
      audit(actor, "publication", "summary_drafted", "report", input.reportId, null, input.audience);
      return { ok: true, data: { saved: true } };
    },
    async createUpdate(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!canEditPublication(actor)) return fail(DENIED);
      const reviewer = actor.displayName.trim().length >= 3 ? actor.displayName.trim() : `account ${actor.id.slice(0, 8)}`;
      if (input.classification === "verified_fact" && (input.sourceRecord ?? "").trim().length < 8) {
        return fail("A source-checked update needs the source, the point checked and its limits. The reviewer’s account is recorded automatically. A source check is not a legal finding.");
      }
      const combined = [input.headline, input.thisWeek, input.stillAwaiting, input.actionsFollowed, input.driverContribution].join(" ");
      if (containsPrivateWording(combined, privateTexts())) return fail(OVERLAP_ERROR);
      const id = randomUUID();
      updates.push({
        id,
        slug: `${slugify(input.headline)}-${id.slice(0, 8)}`,
        status: "draft",
        headline: input.headline,
        audience: input.audience,
        whatHappened: input.thisWeek,
        whatUnanswered: input.stillAwaiting,
        followUpRole: input.followUpRole,
        nextUpdateDue: input.nextUpdateDue,
        classification: input.classification,
        publishedAt: "",
        thisWeek: input.thisWeek,
        stillAwaiting: input.stillAwaiting,
        actionsFollowed: input.actionsFollowed,
        driverContribution: input.driverContribution,
        corrections: [],
        sourceRecord: input.sourceRecord || "",
        reviewedBy: reviewer,
        editorReviewedBy: null,
        approvedBy: null,
        internalNote: input.internalNote || "",
        authorId: actor.id,
      });
      audit(actor, "publication", "update_drafted", "update", id, null, "draft");
      return { ok: true, data: { id } };
    },
    async reviewUpdate(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!hasRole(actor, "editor")) return fail(DENIED);
      const row = updates.find((item) => item.id === input.id);
      if (!row || row.status !== "draft") return fail("Only a draft can be sent for publication approval.");
      if (row.classification === "verified_fact" && (row.sourceRecord.trim().length < 8 || row.reviewedBy.trim().length < 3)) {
        return fail("A source-checked update needs a recorded source and the signed-in reviewer. A source check is not a legal finding.");
      }
      row.status = "in_review";
      row.editorReviewedBy = actor.id;
      audit(actor, "publication", "update_reviewed", "update", row.id, "draft", "in_review");
      return { ok: true, data: { saved: true } };
    },
    async publishUpdate(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!canPublish(actor)) return fail(DENIED);
      const row = updates.find((item) => item.id === input.id);
      if (!row || row.status !== "in_review" || !row.editorReviewedBy) return fail("Unreviewed content cannot be published.");
      if (row.editorReviewedBy === actor.id) return fail("A different person must approve publication.");
      if (row.classification === "verified_fact" && (row.sourceRecord.trim().length < 8 || row.reviewedBy.trim().length < 3)) {
        return fail("A source-checked update needs a recorded source and the signed-in reviewer. A source check is not a legal finding.");
      }
      const combined = [row.headline, row.whatHappened, row.whatUnanswered, row.thisWeek, row.stillAwaiting, row.actionsFollowed, row.driverContribution].join(" ");
      if (containsPrivateWording(combined, privateTexts())) return fail(OVERLAP_ERROR);
      row.status = "published";
      row.approvedBy = actor.id;
      row.publishedAt = stamp();
      audit(actor, "publication", "update_published", "update", row.id, "in_review", "published");
      return { ok: true, data: { slug: row.slug } };
    },
    async correctUpdate(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!canPublish(actor)) return fail(DENIED);
      const row = updates.find((item) => item.id === input.id && item.status === "published");
      if (!row) return fail(DENIED);
      if (containsPrivateWording(input.note, privateTexts())) return fail(OVERLAP_ERROR);
      row.corrections.push({ note: input.note, at: stamp() });
      audit(actor, "publication", "update_corrected", "update", row.id, "published", "published");
      return { ok: true, data: { saved: true } };
    },
    async saveAction(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!hasRole(actor, "coordinator")) return fail(DENIED);
      if (containsPrivateWording([input.title, input.agreedOutcome, input.latestUpdate].join(" "), privateTexts())) return fail(OVERLAP_ERROR);
      const id = randomUUID();
      const reference = createReference("action", Number(now().slice(0, 4)), randomBytes(5));
      actions.push({ ...input, id, reference, latestUpdate: input.latestUpdate, publicSummaryDraft: "", publicSummaryAuthorId: null, publicSummary: null, publicApprovedBy: null });
      audit(actor, "publication", "action_saved", "action", id, null, input.status);
      return { ok: true, data: { id, reference } };
    },
    async draftPublicAction(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!canEditPublication(actor)) return fail(DENIED);
      const row = actions.find((item) => item.id === input.id);
      if (!row) return fail(DENIED);
      if (containsPrivateWording(input.publicSummary, privateTexts())) return fail(OVERLAP_ERROR);
      row.publicSummaryDraft = input.publicSummary;
      row.publicSummaryAuthorId = actor.id;
      row.publicApprovedBy = null;
      row.publicSummary = null;
      audit(actor, "publication", "public_action_drafted", "action", row.id, null, "draft");
      return { ok: true, data: { saved: true } };
    },
    async approvePublicAction(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!canPublish(actor)) return fail(DENIED);
      const row = actions.find((item) => item.id === input.id);
      if (!row || !row.publicSummaryDraft || !row.publicSummaryAuthorId) return fail("A separately written public summary has to be approved before this action can be public.");
      if (row.publicSummaryAuthorId === actor.id) return fail("A different person must approve publication.");
      if (containsPrivateWording(row.publicSummaryDraft, privateTexts())) return fail(OVERLAP_ERROR);
      row.publicSummary = row.publicSummaryDraft;
      row.publicApprovedBy = actor.id;
      audit(actor, "publication", "public_action_approved", "action", row.id, "draft", "public");
      return { ok: true, data: { saved: true } };
    },
    async saveProcess(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!canReadProcess(actor)) return fail(DENIED);
      if (input.processType === "WRC referral" && ((input.confirmationSource || "").trim().length < 5 || !input.confirmationDate)) {
        return fail("A WRC referral can be recorded only with a confirmation source and date.");
      }
      const id = input.id ?? randomUUID();
      const next: ProcessRow = {
        id,
        processType: input.processType,
        referralDate: input.referralDate || "",
        referenceNumber: input.referenceNumber || "",
        confirmationSource: input.confirmationSource || "",
        confirmationDate: input.confirmationDate || "",
        requestedInformation: input.requestedInformation || "",
        requestDate: input.requestDate || "",
        requestedReplyDate: input.requestedReplyDate || "",
        responseReceived: input.responseReceived || "",
        responsibleRole: input.responsibleRole || "",
        nextStep: input.nextStep || "",
        reviewDate: input.reviewDate || "",
      };
      const index = processes.findIndex((item) => item.id === id);
      if (index >= 0) processes[index] = next;
      else processes.push(next);
      audit(actor, "case", "process_saved", "process", id, null, input.processType);
      return { ok: true, data: { id } };
    },
    async publishPriority(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!canPublish(actor)) return fail(DENIED);
      if (input.agreement.trim().length < 20) return fail("Record how and when this priority was agreed before publishing it.");
      if (containsPrivateWording([input.outcome, input.measure, input.stage, input.agreement].join(" "), privateTexts())) return fail(OVERLAP_ERROR);
      const id = randomUUID();
      priorities.push({ id, outcome: input.outcome, measure: input.measure, stage: input.stage, lastReview: input.lastReview, agreement: input.agreement.trim(), approvedBy: actor.id });
      audit(actor, "publication", "priority_published", "priority", id, null, "published");
      return { ok: true, data: { id } };
    },
    async confirmEligibility(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!hasRole(actor, "coordinator") || actor.id === input.profileId) return fail(DENIED);
      const profile = profiles.find((item) => item.id === input.profileId);
      if (!profile || profile.status === "revoked") return fail("Revoked access has to be reviewed before a new invitation.");
      if (input.note.trim().length < 5) return fail("Record a minimal eligibility note.");
      profile.status = "active";
      if (!assignments.some((item) => item.profileId === profile.id && item.role === "driver" && !item.revokedAt)) {
        assignments.push({ id: randomUUID(), profileId: profile.id, role: "driver", grantedBy: actor.id, grantedAt: stamp(), revokedAt: null });
      }
      audit(actor, "account", "eligibility_confirmed", "profile", profile.id, "pending", "active");
      return { ok: true, data: { saved: true } };
    },
    async grantRole(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!canGrantRole(actor, input.profileId)) return fail("A technical administrator cannot change their own roles.");
      const profile = profiles.find((item) => item.id === input.profileId);
      if (!profile || profile.status !== "active") return fail(DENIED);
      if (assignments.some((item) => item.profileId === profile.id && item.role === input.role && !item.revokedAt)) {
        return { ok: true, data: { saved: true } };
      }
      assignments.push({ id: randomUUID(), profileId: profile.id, role: input.role, grantedBy: actor.id, grantedAt: stamp(), revokedAt: null });
      audit(actor, "account", "role_granted", "profile", profile.id, null, input.role);
      return { ok: true, data: { saved: true } };
    },
    async revokeRole(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      const assignment = assignments.find((item) => item.id === input.assignmentId);
      if (!assignment || !canGrantRole(actor, assignment.profileId)) return fail(DENIED);
      assignment.revokedAt = stamp();
      audit(actor, "account", "role_revoked", "profile", assignment.profileId, assignment.role, "revoked");
      return { ok: true, data: { saved: true } };
    },
    async revokeMember(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!canManageAccounts(actor) || actor.id === input.profileId) return fail(DENIED);
      const profile = profiles.find((item) => item.id === input.profileId);
      if (!profile) return fail(DENIED);
      profile.status = "revoked";
      assignments.forEach((item) => {
        if (item.profileId === profile.id && !item.revokedAt) item.revokedAt = stamp();
      });
      audit(actor, "account", "access_revoked", "profile", profile.id, "active", "revoked");
      return { ok: true, data: { saved: true } };
    },
    async updateProfile(presented, input) {
      const blocked = requireCollection();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const profile = profiles.find((item) => item.id === actor.id);
      if (!profile) return fail(DENIED);
      profile.displayName = input.displayName;
      profile.contactPreference = input.contactPreference;
      profile.emailUpdates = input.emailUpdates === "yes";
      profile.mobile = input.mobile;
      profile.whatsappConsent = input.whatsappConsent === "yes";
      if (profile.termsVersion !== TERMS_VERSION || !profile.termsAcceptedAt) {
        profile.termsAcceptedAt = stamp();
        profile.termsVersion = TERMS_VERSION;
      }
      audit(actor, "account", "profile_updated", "profile", actor.id, null, "terms_accepted");
      return { ok: true, data: { saved: true } };
    },
    async saveSettings(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!hasRole(actor, "coordinator") && !hasRole(actor, "tech_admin")) return fail(DENIED);
      settings = {
        ...settings,
        controllerName: input.controllerName,
        controllerContact: input.controllerContact,
        purposes: input.purposes,
        article6Basis: input.article6Basis,
        article9Condition: input.article9Condition,
        processors: input.processors,
        hosting: input.hosting,
        transfers: input.transfers,
        retention: input.retention,
        rightsProcedure: input.rightsProcedure,
        breachProcedure: input.breachProcedure,
        dpiaAssessment: input.dpiaAssessment,
        organisingStartDate: input.organisingStartDate || null,
        publishNotice: input.publishNotice === "yes",
      };
      audit(actor, "settings", "privacy_settings_saved", "settings", "site", null, null);
      return { ok: true, data: { saved: true } };
    },
    async confirmPrivacy(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!canConfirmPrivacy(actor, input.which, settings)) return fail("A different coordinator and technical administrator must each confirm the privacy configuration.");
      if (input.which === "coordinator") {
        settings.coordinatorConfirmedAt = stamp();
        settings.coordinatorConfirmedBy = actor.id;
      } else {
        settings.techConfirmedAt = stamp();
        settings.techConfirmedBy = actor.id;
      }
      audit(actor, "settings", "privacy_confirmed", "settings", "site", null, input.which);
      return { ok: true, data: { saved: true } };
    },
    async setLegalHold(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!hasRole(actor, "coordinator")) return fail(DENIED);
      const report = reports.find((item) => item.id === input.reportId);
      if (!report) return fail(DENIED);
      const index = holds.findIndex((item) => item.reportId === report.id);
      if (input.hold) {
        if (input.reason.trim().length < 8) return fail("Record why the record must be preserved.");
        if (index === -1) holds.push({ reportId: report.id, reason: input.reason.trim(), by: actor.id });
      } else if (index >= 0) {
        holds.splice(index, 1);
      }
      audit(actor, "case", input.hold ? "legal_hold_set" : "legal_hold_cleared", "report", report.id, null, input.hold ? "hold" : "open");
      return { ok: true, data: { saved: true } };
    },
    async deleteReport(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!hasRole(actor, "coordinator")) return fail(DENIED);
      const report = reports.find((item) => item.id === input.reportId);
      if (!report) return fail(DENIED);
      if (holds.some((item) => item.reportId === report.id)) return fail("This record is under a preservation hold and was not deleted.");
      const index = reports.findIndex((item) => item.id === report.id);
      reports.splice(index, 1);
      audit(actor, "case", "report_deleted", "report", report.id, report.status, "deleted");
      return { ok: true, data: { saved: true } };
    },
    async publishAggregate(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!hasRole(actor, "survey_admin")) return fail(DENIED);
      const counts: Record<string, number> = {};
      for (const response of surveyResponses) counts[response.first] = (counts[response.first] ?? 0) + 1;
      const suppressed = suppressCounts(counts);
      if (suppressed.withheld || suppressed.cells.some((cell) => cell.count === null)) {
        return fail(suppressed.note || "Results are withheld.");
      }
      if (JSON.stringify(suppressed).includes("Fictional other priority")) return fail("Raw comments cannot be published.");
      audit(actor, "survey", "aggregate_published", "survey", IDS.surveyPeriod, null, input.audience);
      return { ok: true, data: { saved: true } };
    },
    async createInvitation(presented, input) {
      const blocked = requireAdmin();
      if (blocked) return blocked;
      const actor = active(presented);
      if ("ok" in actor) return actor;
      const mfa = privileged(actor);
      if (mfa) return mfa;
      if (!canManageAccounts(actor)) return fail(DENIED);
      const invitationId = randomUUID();
      invitations.push({ id: invitationId, email: input.email.toLowerCase(), invitedBy: actor.id, createdAt: stamp() });
      audit(actor, "account", "invitation_created", "invitation", invitationId, null, "invited");
      return { ok: true, data: { invitationId } };
    },
    async inspection() {
      const published = await store.listPublicUpdates();
      const prioritiesNow = await store.listAgreedPriorities();
      const publicActions = await store.listPublicActionSummaries();
      const profilesNow = await store.publicVolunteerProfiles();
      return {
        reportCount: reports.length,
        body(id: string) {
          return reports.find((item) => item.id === id)?.whatHappened ?? "";
        },
        publicBlob: JSON.stringify({ published, prioritiesNow, publicActions, profilesNow }),
      };
    },
  };

  return store;
}
