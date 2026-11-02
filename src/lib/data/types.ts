import type {
  ActionStatus,
  Actor,
  Audience,
  Classification,
  PrivacySettings,
  PublicUpdate,
  ReportStatus,
  Role,
  VerificationStatus,
} from "@/lib/domain";
import type {
  ActionInput,
  ConcernInput,
  IncidentInput,
  PriorityInput,
  PrivacyInput,
  ProcessInput,
  ProfileInput,
  QuestionInput,
  SurveyInput,
  UpdateInput,
  VolunteerInput,
} from "@/lib/validation";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export interface ReportCore {
  id: string;
  reference: string;
  kind: "concern" | "incident" | "callback";
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
  submittedAt: string | null;
  verificationStatus: VerificationStatus;
  events: { at: string; label: string }[];
  infoRequests: { id: string; message: string; dueAt: string; respondedAt: string | null }[];
  addenda: { at: string; body: string }[];
  memberSummary: string | null;
}

export interface CommitteeReport extends ReportCore {
  ownerId: string;
  ownerName: string;
  assessment: string;
  verificationSource: string | null;
  verifiedBy: string | null;
  notes: { id: string; at: string; body: string; authorName: string }[];
  assignees: { id: string; name: string }[];
  publicSummary: string | null;
  legalHold: boolean;
}

export type ReportView = { kind: "owner"; report: ReportCore } | { kind: "committee"; report: CommitteeReport };

export interface ActionView {
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
  updateDue: boolean;
  visibility: "members" | "public";
  publicSummary: string | null;
}

export interface AgreedPriority {
  id: string;
  outcome: string;
  measure: string;
  stage: string;
  lastReview: string;
  agreement: string;
}

export interface SurveyState {
  open: boolean;
  closesAt: string;
  response: { first: string; second: string; third: string; otherText: string } | null;
  aggregateNote: string;
}

export interface DriverDashboard {
  reports: { id: string; reference: string; title: string; status: ReportStatus; kind: string }[];
  infoRequests: { id: string; reportId: string; reference: string; message: string; dueAt: string }[];
  survey: SurveyState;
  actions: ActionView[];
  updates: PublicUpdate[];
  nextReview: string | null;
}

export interface QueueItem {
  id: string;
  reference: string;
  title: string;
  category: string;
  status: ReportStatus;
  ownerName: string;
  submittedAt: string | null;
  assigneeNames: string[];
  updateDue: boolean;
}

export interface AdminOverview {
  queue: number;
  drafts: number;
  awaitingPublication: number;
  questions: number;
  volunteers: number;
  retentionDue: { reference: string; reviewOn: string }[];
  reviewsDue: { reference: string; nextReviewDate: string }[];
  canSeeReportContent: boolean;
}

export interface MemberView {
  id: string;
  displayName: string;
  status: string;
  roles: Role[];
  fictional: boolean;
  mobile: string | null;
  whatsappConsent: boolean;
  termsAcceptedAt: string | null;
}

export interface SignupContactView {
  mobile: string | null;
  whatsappConsent: boolean;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
}

export interface AuditView {
  id: string;
  at: string;
  action: string;
  entityType: string;
  entityId: string;
  fromStatus: string | null;
  toStatus: string | null;
}

export interface SettingsView {
  settings: PrivacySettings;
  ready: boolean;
  canEdit: boolean;
  canConfirmCoordinator: boolean;
  canConfirmTech: boolean;
}

export interface SurveyAdminView {
  responses: { profileName: string; first: string; second: string; third: string; otherText: string }[];
  aggregateNote: string;
  withheld: boolean;
}

export interface DataStore {
  readonly mode: "demo" | "live";
  readonly submissionsOpen: boolean;
  readonly uploadsOpen: boolean;
  readonly acceptsAdminWrites: boolean;
  collectionState(): Promise<boolean>;
  actorById(id: string): Promise<Actor | null>;
  listPublicUpdates(): Promise<PublicUpdate[]>;
  getPublicUpdate(slug: string): Promise<PublicUpdate | null>;
  listAgreedPriorities(): Promise<AgreedPriority[]>;
  getOrganisingStartDate(): Promise<string | null>;
  getPublicPrivacy(): Promise<{ controllerName: string; controllerContact: string; purposes: string; article6Basis: string; article9Condition: string; processors: string; hosting: string; transfers: string; retention: string; rightsProcedure: string; breachProcedure: string; dpiaAssessment: string } | null>;
  listPublicActionSummaries(): Promise<{ reference: string; summary: string }[]>;
  dashboard(actor: Actor): Promise<DriverDashboard | null>;
  getReport(actor: Actor, id: string): Promise<ReportView | null>;
  getMemberUpdate(actor: Actor, slug: string): Promise<PublicUpdate | null>;
  listActions(actor: Actor): Promise<ActionView[]>;
  surveyState(actor: Actor): Promise<SurveyState | null>;
  adminOverview(actor: Actor): Promise<AdminOverview | null>;
  listQueue(actor: Actor, filter: { status?: string; category?: string }): Promise<QueueItem[]>;
  listVolunteers(actor: Actor): Promise<{ id: string; name: string; contact: string; depot: string; shiftPattern: string; preferredRole: string; statement: string; consentProfile: boolean; status: string }[]>;
  listQuestions(actor: Actor): Promise<{ id: string; reference: string; pageRef: string; question: string; explanation: string; contactPreference: string; status: string }[]>;
  listOwnQuestions(actor: Actor): Promise<{ id: string; reference: string; pageRef: string; question: string; status: string }[]>;
  listProcess(actor: Actor): Promise<{ id: string; processType: string; referralDate: string; referenceNumber: string; confirmationSource: string; confirmationDate: string; requestedInformation: string; requestDate: string; requestedReplyDate: string; responseReceived: string; responsibleRole: string; nextStep: string; reviewDate: string }[]>;
  listMembers(actor: Actor): Promise<MemberView[]>;
  signupState(actor: Actor): Promise<SignupContactView | null>;
  listAudit(actor: Actor): Promise<AuditView[]>;
  settingsFor(actor: Actor): Promise<SettingsView | null>;
  listUpdateDrafts(actor: Actor): Promise<(PublicUpdate & { status: string; sourceRecord: string; reviewedBy: string; internalNote: string; editorReviewedBy: string | null })[]>;
  surveyAdmin(actor: Actor): Promise<SurveyAdminView | null>;
  publicVolunteerProfiles(): Promise<{ name: string; statement: string }[]>;
  saveConcern(actor: Actor, input: ConcernInput): Promise<Result<{ id: string; reference: string; status: ReportStatus }>>;
  saveIncident(actor: Actor, input: IncidentInput): Promise<Result<{ id: string; reference: string; status: ReportStatus }>>;
  respondToInfo(actor: Actor, input: { requestId: string; body: string }): Promise<Result<{ saved: true }>>;
  requestChange(actor: Actor, input: { reportId: string; kind: "correction" | "closure"; message: string }): Promise<Result<{ saved: true }>>;
  saveSurvey(actor: Actor, input: SurveyInput): Promise<Result<{ saved: true }>>;
  saveVolunteer(actor: Actor, input: VolunteerInput): Promise<Result<{ saved: true }>>;
  saveQuestion(actor: Actor, input: QuestionInput & { profileId?: string }): Promise<Result<{ reference: string }>>;
  addNote(actor: Actor, input: { reportId: string; body: string }): Promise<Result<{ saved: true }>>;
  assignReport(actor: Actor, input: { reportId: string; assigneeId: string }): Promise<Result<{ saved: true }>>;
  transitionReport(actor: Actor, input: { reportId: string; status: ReportStatus }): Promise<Result<{ saved: true }>>;
  setVerification(actor: Actor, input: { reportId: string; status: VerificationStatus; source: string }): Promise<Result<{ saved: true }>>;
  requestInfo(actor: Actor, input: { reportId: string; message: string; dueInDays: number }): Promise<Result<{ saved: true }>>;
  saveSummary(actor: Actor, input: { reportId: string; audience: Audience; body: string }): Promise<Result<{ saved: true }>>;
  createUpdate(actor: Actor, input: UpdateInput): Promise<Result<{ id: string }>>;
  reviewUpdate(actor: Actor, input: { id: string }): Promise<Result<{ saved: true }>>;
  publishUpdate(actor: Actor, input: { id: string }): Promise<Result<{ slug: string }>>;
  correctUpdate(actor: Actor, input: { id: string; note: string }): Promise<Result<{ saved: true }>>;
  saveAction(actor: Actor, input: ActionInput): Promise<Result<{ id: string; reference: string }>>;
  draftPublicAction(actor: Actor, input: { id: string; publicSummary: string }): Promise<Result<{ saved: true }>>;
  approvePublicAction(actor: Actor, input: { id: string }): Promise<Result<{ saved: true }>>;
  saveProcess(actor: Actor, input: ProcessInput & { id?: string }): Promise<Result<{ id: string }>>;
  publishPriority(actor: Actor, input: PriorityInput): Promise<Result<{ id: string }>>;
  confirmEligibility(actor: Actor, input: { profileId: string; note: string }): Promise<Result<{ saved: true }>>;
  grantRole(actor: Actor, input: { profileId: string; role: Role }): Promise<Result<{ saved: true }>>;
  revokeRole(actor: Actor, input: { assignmentId: string }): Promise<Result<{ saved: true }>>;
  revokeMember(actor: Actor, input: { profileId: string }): Promise<Result<{ saved: true }>>;
  updateProfile(actor: Actor, input: ProfileInput): Promise<Result<{ saved: true }>>;
  saveSettings(actor: Actor, input: PrivacyInput): Promise<Result<{ saved: true }>>;
  confirmPrivacy(actor: Actor, input: { which: "coordinator" | "tech_admin" }): Promise<Result<{ saved: true }>>;
  setLegalHold(actor: Actor, input: { reportId: string; hold: boolean; reason: string }): Promise<Result<{ saved: true }>>;
  deleteReport(actor: Actor, input: { reportId: string }): Promise<Result<{ saved: true }>>;
  publishAggregate(actor: Actor, input: { audience: "committee" | "members" | "public" }): Promise<Result<{ saved: true }>>;
  createInvitation(actor: Actor, input: { email: string }): Promise<Result<{ invitationId: string }>>;
  inspection(): Promise<{ reportCount: number; body(id: string): string; publicBlob: string }>;
}
