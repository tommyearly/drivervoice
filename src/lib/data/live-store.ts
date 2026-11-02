import type { Actor, PublicUpdate, ReportStatus, Role, VerificationStatus } from "@/lib/domain";
import { COLLECTION_CLOSED, DEMO_WRITE_BLOCKED, OVERLAP_ERROR } from "@/lib/copy";
import { canConfirmPrivacy, canReadNotes, canReadReport, privacyReady, toPublicUpdate, updateDue, type PrivacySettings, type UpdateDraft } from "@/lib/domain";
import type { DataStore, ReportView, Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapError(message: string): string {
  if (message.includes("collection_closed")) return COLLECTION_CLOSED;
  if (message.includes("mfa_required")) return "Multi-factor authentication is required for this action.";
  if (message.includes("overlaps_private_record")) return OVERLAP_ERROR;
  if (message.includes("unreviewed")) return "Unreviewed content cannot be published.";
  if (message.includes("legal_hold")) return "This record is under a preservation hold and was not deleted.";
  if (message.includes("not_authorised")) return "You do not have access to that record.";
  if (message.includes("rate_limited")) return "Too many attempts. Wait a minute and try again.";
  if (message.includes("validation")) return "Check the form and try again.";
  return "The action could not be completed.";
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<Result<T>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(name, args);
    if (error) return { ok: false, error: mapError(error.message) };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "The action could not be completed." };
  }
}

function published(row: Row, corrections: { note: string; at: string }[]): PublicUpdate | null {
  const draft: UpdateDraft = {
    id: text(row.id),
    slug: text(row.slug),
    headline: text(row.headline),
    audience: row.audience === "members" ? "members" : "public",
    whatHappened: text(row.what_happened),
    whatUnanswered: text(row.what_unanswered),
    followUpRole: text(row.follow_up_role),
    nextUpdateDue: text(row.next_update_due) || null,
    classification: (text(row.classification) || "proposal") as UpdateDraft["classification"],
    publishedAt: text(row.published_at),
    thisWeek: text(row.this_week),
    stillAwaiting: text(row.still_awaiting),
    actionsFollowed: text(row.actions_followed),
    driverContribution: text(row.driver_contribution),
    corrections,
    status: "published",
    sourceRecord: "",
    reviewedBy: "",
    editorReviewedBy: null,
    approvedBy: null,
    internalNote: "",
  };
  return toPublicUpdate(draft);
}

export function createLiveStore(): DataStore {
  async function current(presented: Actor | null): Promise<Actor | null> {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user || !presented || presented.id !== data.user.id) return null;
    const [{ data: profile }, { data: roles }, aal] = await Promise.all([
      supabase.from("profiles").select("id, display_name, status").eq("id", data.user.id).maybeSingle(),
      supabase.from("role_assignments").select("role").eq("profile_id", data.user.id).is("revoked_at", null),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    if (!profile) return null;
    return {
      id: profile.id,
      displayName: profile.display_name ?? "",
      status: profile.status,
      roles: (roles ?? []).map((item) => item.role),
      mfa: aal.data?.currentLevel === "aal2" ? "aal2" : "aal1",
    };
  }

  async function open(): Promise<boolean> {
    const supabase = await createClient();
    const { data } = await supabase.from("site_status").select("submissions_open").maybeSingle();
    return Boolean(data?.submissions_open);
  }

  const store: DataStore = {
    mode: "live",
    submissionsOpen: false,
    uploadsOpen: false,
    acceptsAdminWrites: true,
    async collectionState() {
      return open();
    },
    async actorById(id) {
      return current({ id, displayName: "", status: "active", roles: [], mfa: "aal1" });
    },
    async listPublicUpdates() {
      const supabase = await createClient();
      const [{ data }, { data: corrections }] = await Promise.all([
        supabase.from("published_updates").select("id, slug, headline, audience, what_happened, what_unanswered, follow_up_role, next_update_due, classification, published_at, this_week, still_awaiting, actions_followed, driver_contribution"),
        supabase.from("published_corrections").select("update_id, note, corrected_at"),
      ]);
      return (data ?? []).flatMap((row) => {
        const notes = (corrections ?? [])
          .filter((item) => item.update_id === row.id)
          .map((item) => ({ note: item.note, at: item.corrected_at }));
        const item = published(row, notes);
        return item ? [item] : [];
      });
    },
    async getPublicUpdate(slug) {
      const updates = await store.listPublicUpdates();
      return updates.find((item) => item.slug === slug) ?? null;
    },
    async listAgreedPriorities() {
      const supabase = await createClient();
      const withAgreement = await supabase.from("public_priorities").select("id, outcome, measure, stage, last_review, agreement_note");
      const data = withAgreement.error ? (await supabase.from("public_priorities").select("id, outcome, measure, stage, last_review")).data : withAgreement.data;
      return (data ?? []).map((row: { id: string; outcome: string; measure: string; stage: string; last_review: string; agreement_note?: string | null }) => ({
        id: row.id,
        outcome: row.outcome,
        measure: row.measure,
        stage: row.stage,
        lastReview: row.last_review,
        agreement: row.agreement_note ?? "",
      }));
    },
    async getOrganisingStartDate() {
      const supabase = await createClient();
      const { data } = await supabase.from("public_plan").select("organising_start_date").maybeSingle();
      return data?.organising_start_date ?? null;
    },
    async getPublicPrivacy() {
      const supabase = await createClient();
      const { data } = await supabase.from("public_privacy_notice").select("*").maybeSingle();
      if (!data) return null;
      return {
        controllerName: data.controller_name,
        controllerContact: data.controller_contact,
        purposes: data.purposes,
        article6Basis: data.article6_basis,
        article9Condition: data.article9_condition,
        processors: data.processors,
        hosting: data.hosting,
        transfers: data.transfers,
        retention: data.retention,
        rightsProcedure: data.rights_procedure,
        breachProcedure: data.breach_procedure,
        dpiaAssessment: data.dpia_assessment,
      };
    },
    async listPublicActionSummaries() {
      const supabase = await createClient();
      const { data } = await supabase.from("public_action_summaries").select("reference, summary");
      return (data ?? []).map((row) => ({ reference: row.reference, summary: row.summary }));
    },
    async dashboard(presented) {
      const actor = await current(presented);
      if (!actor || actor.status !== "active" || !actor.roles.includes("driver")) return null;
      const supabase = await createClient();
      const [reports, actions, updates, survey, requests] = await Promise.all([
        supabaseReports(actor.id),
        store.listActions(actor),
        supabase.from("member_updates").select("*").then(({ data }) =>
          (data ?? []).flatMap((row) => {
            const item = published(row, []);
            return item ? [item] : [];
          }),
        ),
        store.surveyState(actor),
        supabase.from("report_info_requests").select("id, report_id, message, due_at").is("responded_at", null),
      ]);
      const owned = new Map(reports.map((report) => [text(report.id), text(report.reference)]));
      return {
        reports: reports.map((report) => ({ id: text(report.id), reference: text(report.reference), title: text(report.title), status: text(report.status) as ReportStatus, kind: text(report.kind) })),
        infoRequests: (requests.data ?? [])
          .filter((item) => owned.has(text(item.report_id)))
          .map((item) => ({ id: text(item.id), reportId: text(item.report_id), reference: owned.get(text(item.report_id)) ?? "", message: text(item.message), dueAt: text(item.due_at) })),
        survey: survey ?? { open: false, closesAt: "", response: null, aggregateNote: "" },
        actions,
        updates,
        nextReview: actions.map((item) => item.nextReviewDate).sort()[0] ?? null,
      };
    },
    async getReport(presented, id) {
      const actor = await current(presented);
      if (!actor) return null;
      const supabase = await createClient();
      const { data } = await supabase.from("reports").select("id, reference, kind, owner_id, status, category, title, event_date, event_date_end, event_time, depot_context, route_or_duty, what_happened, personally_observed, needs_checking, effect_on_work, outcome_requested, official_channel, official_reference, contact_method, contact_detail, outstanding_issue, support_requested, sensitive, submitted_at").eq("id", id).maybeSingle();
      if (!data) return null;
      const { data: assignmentRows } = await supabase.from("report_assignments").select("assignee_id, removed_at").eq("report_id", id);
      const assignments = (assignmentRows ?? []).map((item) => ({ reportId: id, assigneeId: item.assignee_id, removedAt: item.removed_at }));
      const report = { id: data.id, ownerId: data.owner_id, status: data.status as ReportStatus };
      if (!canReadReport(actor, report, assignments)) return null;
      const core = {
        id: data.id,
        reference: data.reference,
        kind: data.kind,
        status: data.status,
        category: data.category,
        title: data.title,
        eventDate: data.event_date ?? "",
        eventDateEnd: data.event_date_end,
        eventTime: data.event_time,
        depotContext: data.depot_context,
        routeOrDuty: data.route_or_duty,
        whatHappened: data.what_happened,
        personallyObserved: data.personally_observed,
        needsChecking: data.needs_checking,
        effectOnWork: data.effect_on_work,
        outcomeRequested: data.outcome_requested,
        officialChannel: data.official_channel,
        officialReference: data.official_reference,
        contactMethod: data.contact_method,
        contactDetail: data.contact_detail,
        outstandingIssue: data.outstanding_issue,
        supportRequested: data.support_requested,
        sensitive: data.sensitive,
        submittedAt: data.submitted_at,
        verificationStatus: "unverified" as VerificationStatus,
        events: [],
        infoRequests: [],
        addenda: [],
        memberSummary: null,
      };
      if (!canReadNotes(actor, report, assignments)) return { kind: "owner", report: core } satisfies ReportView;
      const [{ data: notes }, { data: assessment }] = await Promise.all([
        supabase.from("report_notes").select("id, body, created_at, author_id").eq("report_id", id),
        supabase.from("report_assessments").select("assessment, verification_status, verification_source, verified_by").eq("report_id", id).maybeSingle(),
      ]);
      core.verificationStatus = (assessment?.verification_status ?? "unverified") as VerificationStatus;
      return {
        kind: "committee",
        report: {
          ...core,
          ownerId: data.owner_id,
          ownerName: "Driver",
          assessment: assessment?.assessment ?? "",
          verificationSource: assessment?.verification_source ?? null,
          verifiedBy: null,
          notes: (notes ?? []).map((note) => ({ id: note.id, at: note.created_at, body: note.body, authorName: "Reviewer" })),
          assignees: assignments.filter((item) => !item.removedAt).map((item) => ({ id: item.assigneeId, name: "Reviewer" })),
          publicSummary: null,
          legalHold: false,
        },
      };
    },
    async getMemberUpdate(presented, slug) {
      const actor = await current(presented);
      if (!actor || !actor.roles.includes("driver")) return null;
      const supabase = await createClient();
      const { data } = await supabase.from("member_updates").select("*").eq("slug", slug).maybeSingle();
      return data ? published(data, []) : null;
    },
    async listActions(presented) {
      const actor = await current(presented);
      if (!actor || !actor.roles.includes("driver")) return [];
      const supabase = await createClient();
      const { data } = await supabase.from("member_actions").select("*");
      const today = new Date().toISOString().slice(0, 10);
      return (data ?? []).map((row) => ({
        id: row.id,
        reference: row.reference,
        title: row.title,
        agreedOutcome: row.agreed_outcome,
        responsibleRole: row.responsible_role,
        dateAgreed: row.date_agreed,
        targetDate: row.target_date,
        status: row.status,
        latestUpdate: row.latest_update,
        nextReviewDate: row.next_review_date,
        updateDue: updateDue(row.status, row.target_date, today),
        visibility: row.public_summary ? "public" as const : "members" as const,
        publicSummary: row.public_summary,
      }));
    },
    async surveyState(presented) {
      const actor = await current(presented);
      if (!actor || !actor.roles.includes("driver")) return null;
      const supabase = await createClient();
      const { data } = await supabase.from("survey_responses").select("rank_first, rank_second, rank_third, other_text").eq("profile_id", actor.id).maybeSingle();
      return {
        open: await open(),
        closesAt: "",
        response: data ? { first: data.rank_first, second: data.rank_second, third: data.rank_third, otherText: data.other_text } : null,
        aggregateNote: "Approved totals are published only when a survey administrator releases a suppressed summary.",
      };
    },
    async adminOverview(presented) {
      const actor = await current(presented);
      if (!actor || actor.status !== "active") return null;
      const queue = await store.listQueue(actor, {});
      return {
        queue: queue.length,
        drafts: 0,
        awaitingPublication: 0,
        questions: 0,
        volunteers: 0,
        retentionDue: [],
        reviewsDue: [],
        canSeeReportContent: actor.roles.includes("coordinator") || actor.roles.includes("reviewer"),
      };
    },
    async listQueue(presented, filter) {
      const actor = await current(presented);
      if (!actor) return [];
      const supabase = await createClient();
      let query = supabase.from("reports").select("id, reference, title, category, status, owner_id, submitted_at, response_due").neq("status", "draft");
      if (filter.status) query = query.eq("status", filter.status);
      if (filter.category) query = query.eq("category", filter.category);
      const { data } = await query;
      const today = new Date().toISOString().slice(0, 10);
      return (data ?? []).map((row) => ({
        id: row.id,
        reference: row.reference,
        title: row.title,
        category: row.category,
        status: row.status,
        ownerName: "Driver",
        submittedAt: row.submitted_at,
        assigneeNames: [],
        updateDue: Boolean(row.response_due && row.response_due < today && row.status !== "resolved" && row.status !== "closed"),
      }));
    },
    async listVolunteers(presented) {
      const actor = await current(presented);
      if (!actor?.roles.includes("coordinator")) return [];
      const supabase = await createClient();
      const { data } = await supabase.from("volunteer_applications").select("id, name, contact, depot, shift_pattern, preferred_role, statement, consent_profile, status");
      return (data ?? []).map((row) => ({ id: row.id, name: row.name, contact: row.contact, depot: row.depot, shiftPattern: row.shift_pattern, preferredRole: row.preferred_role, statement: row.statement, consentProfile: row.consent_profile, status: row.status }));
    },
    async listQuestions(presented) {
      const actor = await current(presented);
      if (!actor?.roles.includes("coordinator")) return [];
      const supabase = await createClient();
      const { data } = await supabase.from("questions").select("id, reference, page_ref, question, explanation, contact_preference, status");
      return (data ?? []).map((row) => ({ id: row.id, reference: row.reference, pageRef: row.page_ref, question: row.question, explanation: row.explanation, contactPreference: row.contact_preference, status: row.status }));
    },
    async listOwnQuestions(presented) {
      const actor = await current(presented);
      if (!actor) return [];
      const supabase = await createClient();
      const { data } = await supabase.from("questions").select("id, reference, page_ref, question, status").eq("profile_id", actor.id);
      return (data ?? []).map((row) => ({ id: row.id, reference: row.reference, pageRef: row.page_ref, question: row.question, status: row.status }));
    },
    async listProcess(presented) {
      const actor = await current(presented);
      if (!actor?.roles.includes("coordinator")) return [];
      const supabase = await createClient();
      const { data } = await supabase.from("process_entries").select("*");
      return (data ?? []).map((row) => ({
        id: row.id,
        processType: row.process_type,
        referralDate: row.referral_date ?? "",
        referenceNumber: row.reference_number,
        confirmationSource: row.confirmation_source,
        confirmationDate: row.confirmation_date ?? "",
        requestedInformation: row.requested_information,
        requestDate: row.request_date ?? "",
        requestedReplyDate: row.requested_reply_date ?? "",
        responseReceived: row.response_received,
        responsibleRole: row.responsible_role,
        nextStep: row.next_step,
        reviewDate: row.review_date ?? "",
      }));
    },
    async listMembers(presented) {
      const actor = await current(presented);
      if (!actor || (!actor.roles.includes("tech_admin") && !actor.roles.includes("coordinator"))) return [];
      const supabase = await createClient();
      const [{ data }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, status"),
        supabase.from("role_assignments").select("profile_id, role").is("revoked_at", null),
      ]);
      return (data ?? []).map((row) => ({
        id: row.id,
        displayName: row.display_name,
        status: row.status,
        roles: (roleRows ?? [])
          .filter((item) => item.profile_id === row.id)
          .map((item) => item.role)
          .filter((role): role is Role => ["driver", "reviewer", "coordinator", "editor", "publisher", "tech_admin", "survey_admin"].includes(role)),
        fictional: false,
      }));
    },
    async listAudit(presented) {
      const actor = await current(presented);
      if (!actor?.roles.includes("coordinator") && !actor?.roles.includes("tech_admin")) return [];
      const supabase = await createClient();
      const { data } = await supabase.from("audit_events").select("id, created_at, action, entity_type, entity_id, from_status, to_status, category").order("created_at", { ascending: false }).limit(100);
      return (data ?? [])
        .filter((row) => (actor.roles.includes("tech_admin") && !actor.roles.includes("coordinator") ? row.category === "account" : row.category !== "account" || actor.roles.includes("tech_admin")))
        .map((row) => ({ id: row.id, at: row.created_at, action: row.action, entityType: row.entity_type, entityId: row.entity_id, fromStatus: row.from_status, toStatus: row.to_status }));
    },
    async settingsFor(presented) {
      const actor = await current(presented);
      if (!actor || (!actor.roles.includes("coordinator") && !actor.roles.includes("tech_admin"))) return null;
      const supabase = await createClient();
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (!data) return null;
      const settings: PrivacySettings = {
        controllerName: data.controller_name ?? "",
        controllerContact: data.controller_contact ?? "",
        purposes: data.purposes ?? "",
        article6Basis: data.article6_basis ?? "",
        article9Condition: data.article9_condition ?? "",
        processors: data.processors ?? "",
        hosting: data.hosting ?? "",
        transfers: data.transfers ?? "",
        retention: data.retention ?? "",
        rightsProcedure: data.rights_procedure ?? "",
        breachProcedure: data.breach_procedure ?? "",
        dpiaAssessment: data.dpia_assessment ?? "",
        coordinatorConfirmedAt: data.coordinator_confirmed_at,
        coordinatorConfirmedBy: data.coordinator_confirmed_by,
        techConfirmedAt: data.tech_confirmed_at,
        techConfirmedBy: data.tech_confirmed_by,
        publishNotice: Boolean(data.publish_notice),
        organisingStartDate: data.organising_start_date,
      };
      return {
        settings,
        ready: privacyReady(settings),
        canEdit: true,
        canConfirmCoordinator: canConfirmPrivacy(actor, "coordinator", settings),
        canConfirmTech: canConfirmPrivacy(actor, "tech_admin", settings),
      };
    },
    async listUpdateDrafts(presented) {
      const actor = await current(presented);
      if (!actor || (!actor.roles.includes("editor") && !actor.roles.includes("publisher") && !actor.roles.includes("coordinator"))) return [];
      const supabase = await createClient();
      const { data } = await supabase.from("update_workbench").select("id, slug, headline, audience, what_happened, what_unanswered, follow_up_role, next_update_due, classification, published_at, this_week, still_awaiting, actions_followed, driver_contribution, status, source_record, reviewed_by, internal_note, editor_reviewed_by");
      return (data ?? []).flatMap((row) => {
        const item = published({ ...row, published_at: row.published_at ?? "" }, []);
        if (!item) return [];
        return [{ ...item, status: row.status, sourceRecord: row.source_record, reviewedBy: row.reviewed_by, internalNote: row.internal_note, editorReviewedBy: row.editor_reviewed_by, publishedAt: row.published_at ?? "" }];
      });
    },
    async surveyAdmin(presented) {
      const actor = await current(presented);
      if (!actor?.roles.includes("survey_admin")) return null;
      const supabase = await createClient();
      const { data } = await supabase.from("survey_responses").select("profile_id, rank_first, rank_second, rank_third, other_text");
      return {
        responses: (data ?? []).map((row) => ({ profileName: row.profile_id, first: row.rank_first, second: row.rank_second, third: row.rank_third, otherText: row.other_text })),
        aggregateNote: "Publish a summary only after small groups are suppressed.",
        withheld: (data ?? []).length < 5,
      };
    },
    async publicVolunteerProfiles() {
      return [];
    },
    async saveConcern(_actor, input) {
      return rpc("save_report", { payload: input });
    },
    async saveIncident(_actor, input) {
      return rpc("save_incident", { payload: input });
    },
    async respondToInfo(_actor, input) {
      return rpc("respond_to_info", { request_id: input.requestId, body: input.body });
    },
    async requestChange(_actor, input) {
      return rpc("request_report_change", { report_id: input.reportId, kind: input.kind, message: input.message });
    },
    async saveSurvey(_actor, input) {
      return rpc("save_survey_response", { first_rank: input.first, second_rank: input.second, third_rank: input.third, other_text: input.otherText ?? "" });
    },
    async saveVolunteer(_actor, input) {
      return rpc("submit_volunteer", { payload: input });
    },
    async saveQuestion(_actor, input) {
      return rpc("submit_question", { payload: input });
    },
    async addNote(_actor, input) {
      return rpc("add_report_note", { report_id: input.reportId, body: input.body });
    },
    async assignReport(_actor, input) {
      return rpc("assign_report", { report_id: input.reportId, assignee_id: input.assigneeId });
    },
    async transitionReport(_actor, input) {
      return rpc("transition_report_status", { report_id: input.reportId, next_status: input.status });
    },
    async setVerification(_actor, input) {
      return rpc("set_verification", { report_id: input.reportId, next_status: input.status, source: input.source });
    },
    async requestInfo(_actor, input) {
      return rpc("request_more_information", { report_id: input.reportId, message: input.message });
    },
    async saveSummary(_actor, input) {
      return rpc("save_case_summary", { report_id: input.reportId, audience: input.audience, body: input.body });
    },
    async createUpdate(_actor, input) {
      return rpc("create_update", { payload: input });
    },
    async reviewUpdate(_actor, input) {
      return rpc("review_update", { update_id: input.id });
    },
    async publishUpdate(_actor, input) {
      return rpc("publish_update", { update_id: input.id });
    },
    async correctUpdate(_actor, input) {
      return rpc("correct_update", { update_id: input.id, note: input.note });
    },
    async saveAction(_actor, input) {
      return rpc("save_action", { payload: input });
    },
    async draftPublicAction(_actor, input) {
      return rpc("draft_public_action", { action_id: input.id, summary: input.publicSummary });
    },
    async approvePublicAction(_actor, input) {
      return rpc("approve_public_action", { action_id: input.id });
    },
    async saveProcess(_actor, input) {
      return rpc("save_process_entry", { payload: input });
    },
    async publishPriority(_actor, input) {
      return rpc("publish_priority", { payload: input });
    },
    async confirmEligibility(_actor, input) {
      return rpc("confirm_eligibility", { profile_id: input.profileId, note: input.note });
    },
    async grantRole(_actor, input) {
      return rpc("grant_role", { profile_id: input.profileId, requested: input.role });
    },
    async revokeRole(_actor, input) {
      return rpc("revoke_role", { assignment_id: input.assignmentId });
    },
    async revokeMember(_actor, input) {
      return rpc("revoke_member", { profile_id: input.profileId });
    },
    async updateProfile(_actor, input) {
      return rpc("update_own_profile", { display_name: input.displayName, contact_preference: input.contactPreference, email_updates: input.emailUpdates === "yes" });
    },
    async saveSettings(_actor, input) {
      return rpc("save_privacy_settings", { payload: input });
    },
    async confirmPrivacy(_actor, input) {
      return rpc("confirm_privacy", { which_role: input.which });
    },
    async setLegalHold(_actor, input) {
      return rpc("set_legal_hold", { report_id: input.reportId, hold: input.hold, reason: input.reason });
    },
    async deleteReport(_actor, input) {
      return rpc("delete_report", { report_id: input.reportId });
    },
    async publishAggregate(_actor, input) {
      return rpc("publish_survey_aggregate", { audience: input.audience });
    },
    async createInvitation(_actor, input) {
      return rpc("create_invitation", { email: input.email });
    },
    async inspection() {
      const publishedUpdates = await store.listPublicUpdates();
      return { reportCount: 0, body: () => "", publicBlob: JSON.stringify(publishedUpdates satisfies PublicUpdate[]) };
    },
  };

  return store;
}

async function supabaseReports(ownerId: string): Promise<Row[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("reports").select("id, reference, title, status, kind").eq("owner_id", ownerId);
  return data ?? [];
}

void DEMO_WRITE_BLOCKED;
