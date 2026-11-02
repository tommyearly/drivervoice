import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { DEMO_WRITE_BLOCKED, OVERLAP_ERROR, PRIVATE_SENTENCE } from "@/lib/copy";
import {
  acknowledgementEmail,
  actionReminderEmail,
  decideDownload,
  detectUpload,
  invitationEmail,
  privacyReady,
  resolveMode,
  suppressCounts,
  weeklyUpdateEmail,
  whatsappAnnouncement,
  emptyPrivacy,
  type Actor,
} from "@/lib/domain";
import { sessionUserFromDemoCookie, signDemoToken } from "@/lib/auth/demo-token";
import { createDemoStore, createGovernedStore } from "@/lib/data/governed-store";
import { IDS } from "@/lib/data/ids";
import { createMemoryRateLimiter } from "@/lib/rate-limit";
import { isPrivatePath, PRIVATE_PREFIXES, PUBLIC_PATHS } from "@/lib/seo";

const origin = "https://driversvoice.ie";

function openStore(enforceMfa = false) {
  return createGovernedStore({ allowCollection: true, allowAdminWrites: true, enforceMfa, now: "2026-11-01" });
}

async function actor(store: ReturnType<typeof openStore>, id: string, mfa: Actor["mfa"] = "aal1"): Promise<Actor> {
  const found = await store.actorById(id);
  if (!found) throw new Error(`missing ${id}`);
  return { ...found, mfa };
}

describe("access control", () => {
  it("stops one driver reading another driver's report", async () => {
    const store = openStore();
    const driverB = await actor(store, IDS.driverB);
    expect(await store.getReport(driverB, IDS.reportA)).toBeNull();
    const own = await store.getReport(await actor(store, IDS.driverA), IDS.reportA);
    expect(own?.kind).toBe("owner");
    expect(JSON.stringify(own)).not.toContain("Internal committee note");
    expect(own?.kind === "owner" && own.report.whatHappened).toContain("UNIQUE-PRIVATE-PHRASE-9F3A");
  });

  it("stops a reviewer opening an unassigned case or a draft", async () => {
    const store = openStore();
    const reviewer = await actor(store, IDS.reviewer, "aal2");
    expect(await store.getReport(reviewer, IDS.reportB)).toBeNull();
    expect(await store.getReport(reviewer, IDS.draftA)).toBeNull();
    const queue = await store.listQueue(reviewer, {});
    expect(queue.map((item) => item.id)).toEqual([IDS.reportA]);
    const assigned = await store.getReport(reviewer, IDS.reportA);
    expect(assigned?.kind).toBe("committee");
  });

  it("gives anonymous and technical-only actors no report access", async () => {
    const store = openStore();
    const stranger: Actor = {
      id: "stranger",
      displayName: "Stranger",
      status: "active",
      roles: ["coordinator", "tech_admin", "publisher", "reviewer"],
      mfa: "aal2",
    };
    expect(await store.getReport(stranger, IDS.reportA)).toBeNull();
    expect(await store.getReport(await actor(store, IDS.tech, "aal2"), IDS.reportA)).toBeNull();
    expect(await store.getReport(await actor(store, IDS.editor, "aal2"), IDS.reportA)).toBeNull();
    expect(await store.getReport(await actor(store, IDS.publisher, "aal2"), IDS.reportA)).toBeNull();
    expect(await store.getReport(await actor(store, IDS.survey, "aal2"), IDS.reportA)).toBeNull();
    expect(await store.listProcess(await actor(store, IDS.editor, "aal2"))).toEqual([]);
    expect(await store.listQuestions(await actor(store, IDS.tech, "aal2"))).toEqual([]);
  });

  it("ignores client-supplied roles", async () => {
    const store = openStore();
    const forged: Actor = {
      ...(await actor(store, IDS.driverA)),
      roles: ["tech_admin", "publisher", "coordinator", "reviewer"],
      mfa: "aal2",
    };
    expect(await store.getReport(forged, IDS.reportB)).toBeNull();
    const published = await store.publishUpdate(forged, { id: IDS.updateReview });
    expect(published.ok).toBe(false);
    const granted = await store.grantRole(forged, { profileId: IDS.driverB, role: "tech_admin" });
    expect(granted.ok).toBe(false);
  });

  it("does not let a technical administrator grant their own role", async () => {
    const store = openStore();
    const tech = await actor(store, IDS.tech, "aal2");
    const self = await store.grantRole(tech, { profileId: IDS.tech, role: "coordinator" });
    expect(self.ok).toBe(false);
    const granted = await store.grantRole(tech, { profileId: IDS.driverA, role: "reviewer" });
    expect(granted.ok).toBe(true);
    const reviewer = await store.actorById(IDS.driverA);
    expect(reviewer?.roles).toContain("reviewer");
  });

  it("refuses unreviewed publication and private wording", async () => {
    const store = openStore();
    const publisher = await actor(store, IDS.publisher, "aal2");
    const editor = await actor(store, IDS.editor, "aal2");
    const draft = await store.publishUpdate(publisher, { id: IDS.updateDraft });
    expect(draft.ok).toBe(false);
    if (!draft.ok) expect(draft.error).toMatch(/Unreviewed/);
    const copied = await store.createUpdate(editor, {
      headline: "A rewritten weekly note",
      audience: "public",
      classification: "proposal",
      thisWeek: PRIVATE_SENTENCE,
      stillAwaiting: "Nothing further.",
      actionsFollowed: "No action is copied here.",
      driverContribution: "Read the published note.",
      nextUpdateDue: "2026-11-20",
      followUpRole: "Communications lead (proposed role)",
      sourceRecord: "",
      reviewedBy: "",
      internalNote: "",
    });
    expect(copied.ok).toBe(false);
    if (!copied.ok) {
      expect(copied.error).toBe(OVERLAP_ERROR);
      expect(copied.error).not.toContain("UNIQUE-PRIVATE-PHRASE");
    }
    const published = await store.publishUpdate(publisher, { id: IDS.updateReview });
    expect(published.ok).toBe(true);
    const samePerson = await store.publishUpdate(editor, { id: IDS.updateReview });
    expect(samePerson.ok).toBe(false);
  });

  it("never marks a submission verified on its own", async () => {
    const store = openStore();
    const driver = await actor(store, IDS.driverA);
    const saved = await store.saveConcern(driver, concern());
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const view = await store.getReport(driver, saved.data.id);
    expect(view?.report.verificationStatus).toBe("unverified");
    const reviewer = await actor(store, IDS.reviewer, "aal2");
    const missing = await store.setVerification(reviewer, { reportId: IDS.reportA, status: "verified", source: "" });
    expect(missing.ok).toBe(false);
    const verified = await store.setVerification(reviewer, { reportId: IDS.reportA, status: "verified", source: "Fictional coordinator notebook, 12 October 2026." });
    expect(verified.ok).toBe(true);
  });

  it("keeps the driver's original account when a correction is requested", async () => {
    const store = openStore();
    const driver = await actor(store, IDS.driverA);
    const before = await store.inspection();
    await store.requestChange(driver, { reportId: IDS.reportA, kind: "correction", message: "Please correct the fictional date." });
    const after = await store.inspection();
    expect(after.body(IDS.reportA)).toBe(before.body(IDS.reportA));
  });

  it("keeps survey answers and small groups private", async () => {
    const store = openStore();
    const driverB = await actor(store, IDS.driverB);
    const own = await store.surveyState(driverB);
    expect(own?.response?.first).toBe("Basic pay");
    expect(JSON.stringify(own)).not.toContain("Fictional other priority");
    expect(await store.surveyAdmin(await actor(store, IDS.coordinator, "aal2"))).toBeNull();
    const admin = await store.surveyAdmin(await actor(store, IDS.survey, "aal2"));
    expect(admin?.responses).toHaveLength(3);
    expect(admin?.withheld).toBe(true);
    const published = await store.publishAggregate(await actor(store, IDS.survey, "aal2"), { audience: "members" });
    expect(published.ok).toBe(false);
    expect(suppressCounts({ Rosters: 2, "Basic pay": 1 }).withheld).toBe(true);
    expect(suppressCounts({ Rosters: 6, "Basic pay": 5 }).withheld).toBe(false);
    expect(suppressCounts({ Rosters: 9, "Basic pay": 1 }).note).toMatch(/identify/i);
  });

  it("does not put private case text into public projections", async () => {
    const store = openStore();
    const blob = (await store.inspection()).publicBlob;
    expect(blob).not.toContain("UNIQUE-PRIVATE-PHRASE");
    expect(blob).not.toContain("KEEP-INTERNAL-NOTE-77");
    expect(blob).not.toContain("fictional-contact-not-for-publication");
    expect(blob).not.toContain("Internal committee note");
    expect(await store.getPublicUpdate("how-a-member-update-will-be-set-out")).toBeNull();
    expect(await store.listPublicActionSummaries()).toEqual([]);
  });

  it("blocks deletion under a preservation hold", async () => {
    const store = openStore();
    const coordinator = await actor(store, IDS.coordinator, "aal2");
    expect((await store.setLegalHold(coordinator, { reportId: IDS.reportA, hold: true, reason: "Needed for a lawful preservation review." })).ok).toBe(true);
    const deleted = await store.deleteReport(coordinator, { reportId: IDS.reportA });
    expect(deleted.ok).toBe(false);
    if (!deleted.ok) expect(deleted.error).toMatch(/preservation hold/);
    expect((await store.inspection()).body(IDS.reportA)).toContain("UNIQUE-PRIVATE-PHRASE");
  });

  it("requires multi-factor authentication for privileged actions when enforced", async () => {
    const store = openStore(true);
    const reviewer = await actor(store, IDS.reviewer, "aal1");
    const denied = await store.addNote(reviewer, { reportId: IDS.reportA, body: "A note that should not save." });
    expect(denied.ok).toBe(false);
    const allowed = await store.addNote({ ...reviewer, mfa: "aal2" }, { reportId: IDS.reportA, body: "A second fictional note." });
    expect(allowed.ok).toBe(true);
  });
});

describe("demonstration mode", () => {
  it("cannot collect a real report", async () => {
    const store = createDemoStore();
    const before = await store.inspection();
    const driver = await actor(store, IDS.driverA);
    const saved = await store.saveConcern(driver, concern());
    expect(saved.ok).toBe(false);
    if (!saved.ok) expect(saved.error).toBe(DEMO_WRITE_BLOCKED);
    expect((await store.inspection()).reportCount).toBe(before.reportCount);
    expect(store.submissionsOpen).toBe(false);
    expect(store.uploadsOpen).toBe(false);
    const settings = await store.saveSettings(await actor(store, IDS.coordinator), privacyInput());
    expect(settings.ok).toBe(false);
  });
});

describe("notifications and files", () => {
  it("keeps narratives out of email and WhatsApp text", () => {
    const signIn = `${origin}/sign-in`;
    const messages = [
      acknowledgementEmail({ reference: "DV-2026-AB234", signInUrl: signIn, origin }),
      actionReminderEmail({ reference: "DVA-2026-AB234", signInUrl: signIn, origin }),
      invitationEmail({ signInUrl: signIn, origin }),
      weeklyUpdateEmail({ headline: "How an approved update will be set out", url: `${origin}/updates/how-an-approved-update-will-be-set-out`, origin }),
    ];
    const combined = messages.map((item) => item.text).join("\n");
    expect(combined).not.toContain(PRIVATE_SENTENCE);
    expect(combined).not.toContain(PRIVATE_SENTENCE.slice(0, 24));
    expect(combined).not.toContain("UNIQUE-PRIVATE-PHRASE");
    expect(() => acknowledgementEmail({ reference: `DV-2026-${PRIVATE_SENTENCE}`, signInUrl: signIn, origin })).toThrow();
    const whatsapp = whatsappAnnouncement({
      headline: "How an approved update will be set out",
      dateLabel: "20 October 2026",
      url: `${origin}/updates/how-an-approved-update-will-be-set-out`,
      origin,
    });
    expect(whatsapp).not.toContain("UNIQUE-PRIVATE-PHRASE");
    expect(whatsapp).toContain("/updates/how-an-approved-update-will-be-set-out");
  });

  it("validates file content and refuses unreleased downloads", () => {
    expect(detectUpload(Buffer.from("<html></html>"), "text/html").ok).toBe(false);
    const pdf = detectUpload(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]), "application/pdf");
    expect(pdf.ok).toBe(true);
    const actorA = { id: IDS.driverA, displayName: "A", status: "active" as const, roles: ["driver" as const], mfa: "aal1" as const };
    const actorB = { ...actorA, id: IDS.driverB };
    const report = { id: IDS.reportA, ownerId: IDS.driverA, status: "under_review" as const };
    const file = { id: "file", ownerId: IDS.driverA, reportId: IDS.reportA, status: "quarantined" as const, scanStatus: "not_scanned" as const, mime: "application/pdf" as const };
    expect(decideDownload(actorB, file, report, [], true).allow).toBe(false);
    expect(decideDownload(null, file, report, [], true).allow).toBe(false);
    expect(decideDownload(actorA, file, report, [], true).allow).toBe(false);
    expect(decideDownload(actorA, { ...file, status: "released", scanStatus: "clean" }, report, [], false).allow).toBe(false);
  });
});

describe("configuration guards", () => {
  it("stays in demonstration until all server credentials exist", () => {
    expect(resolveMode({})).toBe("demo");
    expect(resolveMode({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "b", DRIVERSVOICE_MODE: "demo" })).toBe("demo");
    expect(resolveMode({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "b" })).toBe("live");
  });

  it("does not accept a demonstration cookie in live mode", () => {
    const token = signDemoToken(IDS.tech);
    expect(token).toBeTruthy();
    expect(sessionUserFromDemoCookie("demo", token ?? undefined)).toBe(IDS.tech);
    expect(sessionUserFromDemoCookie("live", token ?? undefined)).toBeNull();
    expect(sessionUserFromDemoCookie("demo", `${IDS.tech}.forged`)).toBeNull();
    expect(signDemoToken("not-a-user")).toBeNull();
  });

  it("requires two different people before privacy setup is complete", () => {
    const settings = emptyPrivacy();
    expect(privacyReady(settings)).toBe(false);
    const ready = privacyReady({
      ...privacyInputToSettings(),
      coordinatorConfirmedAt: "2026-11-01T00:00:00.000Z",
      coordinatorConfirmedBy: IDS.coordinator,
      techConfirmedAt: "2026-11-01T00:00:00.000Z",
      techConfirmedBy: IDS.coordinator,
    });
    expect(ready).toBe(false);
    expect(privacyReady({ ...privacyInputToSettings(), coordinatorConfirmedAt: "2026-11-01", coordinatorConfirmedBy: IDS.coordinator, techConfirmedAt: "2026-11-01", techConfirmedBy: IDS.tech })).toBe(true);
  });

  it("rate limits a repeated key", () => {
    const limiter = createMemoryRateLimiter();
    expect(limiter.consume("a", 2, 1000, 0).ok).toBe(true);
    expect(limiter.consume("a", 2, 1000, 10).ok).toBe(true);
    expect(limiter.consume("a", 2, 1000, 20).ok).toBe(false);
  });

  it("keeps private routes out of the public index", () => {
    expect(isPrivatePath("/portal/reports/10000000-0000-4000-8000-0000000000a1")).toBe(true);
    expect(isPrivatePath("/admin")).toBe(true);
    expect(PUBLIC_PATHS).not.toContain("/portal");
    expect(PRIVATE_PREFIXES).toContain("/portal");
    const robots = readFileSync("src/app/robots.ts", "utf8");
    const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
    expect(robots).toContain("PRIVATE_PREFIXES");
    expect(sitemap).toContain("PUBLIC_PATHS");
    expect(sitemap).not.toContain("/portal");
  });

  it("locks the database scripts to deny-by-default access", () => {
    const sql = readFileSync("supabase/migrations/20261101120000_init.sql", "utf8");
    for (const table of ["profiles", "role_assignments", "reports", "report_notes", "report_assessments", "survey_responses", "process_entries", "audit_events", "stored_files"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("revoke all on all tables in schema public from anon, authenticated");
    expect(sql).toContain("public = false");
    expect(sql).not.toContain("create policy reports_select_anon");
    expect(sql).toContain("overlaps_private");
    expect(sql).toContain("revoke all on function public.overlaps_private(text) from public, anon, authenticated");
    const live = readFileSync("src/lib/data/live-store.ts", "utf8");
    expect(live).toContain("published_updates");
    expect(live).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    const client = readFileSync("src/lib/supabase/admin.ts", "utf8");
    expect(client).toContain("server-only");
  });
});

function concern() {
  return {
    category: "Rosters" as const,
    title: "A new fictional concern",
    eventDate: "2026-10-02",
    eventDateEnd: "",
    depotContext: "",
    whatHappened: "A fictional account with enough detail to pass the minimum length.",
    personallyObserved: "I saw the fictional change myself.",
    needsChecking: "The notice period.",
    effectOnWork: "The duty changed.",
    outcomeRequested: "A written check.",
    officialChannelUsed: "no" as const,
    officialReference: "",
    contactMethod: "account" as const,
    contactDetail: "",
    acknowledgement: "yes" as const,
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    intent: "submit" as const,
  };
}

function privacyInput() {
  const text = "This is a recorded controller decision for the test fixture.";
  return {
    controllerName: "Example controller",
    controllerContact: "example-controller@example.com",
    purposes: text,
    article6Basis: text,
    article9Condition: text,
    processors: text,
    hosting: text,
    transfers: text,
    retention: text,
    rightsProcedure: text,
    breachProcedure: text,
    dpiaAssessment: text,
    organisingStartDate: "",
    publishNotice: "no" as const,
  };
}

function privacyInputToSettings() {
  const input = privacyInput();
  return {
    ...emptyPrivacy(),
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
  };
}
