import { z } from "zod";
import { ACTION_STATUSES, CONCERN_CATEGORIES, INCIDENT_CATEGORIES, REPORT_STATUSES, SURVEY_OPTIONS } from "@/lib/domain";
import { normaliseMobile } from "@/lib/phone";

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date.");
const optionalDate = z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Enter a date or leave this blank.");
const shortText = (min: number, max: number) => z.string().trim().min(min, `Enter at least ${min} characters.`).max(max, `Use ${max} characters or fewer.`);

export const concernSchema = z.object({
  category: z.enum(CONCERN_CATEGORIES),
  title: shortText(5, 120),
  eventDate: dateField,
  eventDateEnd: optionalDate,
  depotContext: z.string().trim().max(80, "Use 80 characters or fewer.").optional().or(z.literal("")),
  whatHappened: shortText(20, 4000),
  personallyObserved: shortText(10, 4000),
  needsChecking: shortText(5, 2000),
  effectOnWork: shortText(5, 2000),
  outcomeRequested: shortText(5, 2000),
  officialChannelUsed: z.enum(["yes", "no", "unsure"]),
  officialReference: z.string().trim().max(80).optional().or(z.literal("")),
  contactMethod: z.enum(["account", "phone", "email"]),
  contactDetail: z.string().trim().max(120).optional().or(z.literal("")),
  acknowledgement: z.literal("yes", { errorMap: () => ({ message: "Confirm that this is a private committee report." }) }),
  idempotencyKey: z.string().uuid("The form needs a fresh submission key. Reload the page."),
  intent: z.enum(["draft", "submit"]),
});

export const incidentSchema = z
  .object({
    category: z.enum(INCIDENT_CATEGORIES),
    eventDate: dateField,
    eventTime: z.string().trim().max(20).regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time as HH:MM or leave it blank."),
    routeOrDuty: z.string().trim().max(80).optional().or(z.literal("")),
    officialChannelUsed: z.enum(["yes", "no", "unsure"]),
    officialReference: z.string().trim().max(80).optional().or(z.literal("")),
    summary: z.string().trim().max(2000).optional().or(z.literal("")),
    outstanding: z.string().trim().max(2000).optional().or(z.literal("")),
    supportRequested: z.string().trim().max(500).optional().or(z.literal("")),
    contactMethod: z.enum(["account", "phone", "email"]),
    contactDetail: z.string().trim().max(120).optional().or(z.literal("")),
    acknowledgement: z.literal("yes", { errorMap: () => ({ message: "Confirm that this is a private follow-up record." }) }),
    idempotencyKey: z.string().uuid(),
    intent: z.enum(["draft", "submit"]),
  })
  .superRefine((value, context) => {
    const sensitive = value.category === "Injury or welfare" || value.category === "Disciplinary" || value.category === "Third-party matter";
    if (sensitive) {
      if ((value.supportRequested ?? "").trim().length < 5) {
        context.addIssue({ code: "custom", path: ["supportRequested"], message: "Say briefly what follow-up you want. Do not include medical or third-party details." });
      }
      if ((value.summary ?? "").trim().length > 0 || (value.outstanding ?? "").trim().length > 0) {
        context.addIssue({ code: "custom", path: ["summary"], message: "For this category, send a callback request only." });
      }
      return;
    }
    if ((value.summary ?? "").trim().length < 20) {
      context.addIssue({ code: "custom", path: ["summary"], message: "Enter a brief factual summary of at least 20 characters." });
    }
    if ((value.outstanding ?? "").trim().length < 5) {
      context.addIssue({ code: "custom", path: ["outstanding"], message: "Describe the outstanding issue." });
    }
  });

export const surveySchema = z
  .object({
    first: z.enum(SURVEY_OPTIONS),
    second: z.enum(SURVEY_OPTIONS),
    third: z.enum(SURVEY_OPTIONS),
    otherText: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    const ranks = [value.first, value.second, value.third];
    if (new Set(ranks).size !== 3) {
      context.addIssue({ code: "custom", path: ["second"], message: "Choose three different priorities." });
    }
    if (ranks.includes("Other") && (value.otherText ?? "").trim().length < 3) {
      context.addIssue({ code: "custom", path: ["otherText"], message: "Describe the other priority in a few words. It will not be published." });
    }
  });

export const volunteerSchema = z.object({
  name: shortText(2, 80),
  contact: shortText(5, 120),
  depot: z.string().trim().max(80).optional().or(z.literal("")),
  shiftPattern: z.string().trim().max(80).optional().or(z.literal("")),
  preferredRole: z.enum([
    "Coordinator",
    "Evidence and records lead",
    "Union liaison",
    "Communications lead",
    "Driver participation lead",
  ]),
  statement: shortText(20, 1200),
  consentProfile: z.enum(["yes", "no"]),
});

export const questionSchema = z.object({
  pageRef: shortText(2, 160),
  question: shortText(10, 2000),
  explanation: shortText(10, 4000),
  contactPreference: z.string().trim().max(120).optional().or(z.literal("")),
  companyWebsite: z.string().max(0).optional().or(z.literal("")),
});

const accepted = (message: string) =>
  z.preprocess((value) => (value == null ? "" : value), z.string()).refine((value) => value === "yes", { message });

export const profileSchema = z.object({
  displayName: shortText(2, 80),
  contactPreference: z.enum(["account", "phone", "email"]),
  emailUpdates: z.enum(["yes", "no"]),
  mobile: z.string().trim().transform((value, context) => {
    const next = normaliseMobile(value);
    if (!next) {
      context.addIssue({ code: "custom", message: "Enter a mobile number a coordinator can use on WhatsApp." });
      return z.NEVER;
    }
    return next;
  }),
  whatsappConsent: accepted("Confirm that a coordinator may contact this number on WhatsApp."),
  termsAccepted: accepted("Accept the terms and conditions."),
});

export const noteSchema = z.object({
  reportId: z.string().uuid(),
  body: shortText(5, 4000),
});

export const verificationSchema = z
  .object({
    reportId: z.string().uuid(),
    status: z.enum(["unverified", "awaiting_confirmation", "verified", "not_verified"]),
    source: z.string().trim().max(1600).optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (value.status === "verified" && (value.source ?? "").trim().length < 8) {
      context.addIssue({ code: "custom", path: ["source"], message: "Record the source, the point checked and its limits before marking a source check." });
    }
  });

export const statusSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(REPORT_STATUSES),
});

export const updateSchema = z
  .object({
    headline: shortText(8, 140),
    audience: z.enum(["public", "members"]),
    classification: z.enum(["verified_fact", "proposal", "awaiting_confirmation"]),
    thisWeek: shortText(10, 2000),
    stillAwaiting: shortText(5, 2000),
    actionsFollowed: shortText(5, 2000),
    driverContribution: shortText(5, 2000),
    nextUpdateDue: dateField,
    followUpRole: shortText(3, 80),
    sourceRecord: z.string().trim().max(500).optional().or(z.literal("")),
    pointChecked: z.string().trim().max(500).optional().or(z.literal("")),
    limitations: z.string().trim().max(500).optional().or(z.literal("")),
    reviewedBy: z.string().trim().max(80).optional().or(z.literal("")),
    internalNote: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (value.classification === "verified_fact") {
      if ((value.sourceRecord ?? "").trim().length < 8) {
        context.addIssue({ code: "custom", path: ["sourceRecord"], message: "Record the source that was checked." });
      }
      if ((value.pointChecked ?? "").trim().length < 8) {
        context.addIssue({ code: "custom", path: ["pointChecked"], message: "Record the precise point that was checked." });
      }
      if ((value.limitations ?? "").trim().length < 8) {
        context.addIssue({ code: "custom", path: ["limitations"], message: "Record what the check does not establish." });
      }
    }
  });

export const actionSchema = z.object({
  title: shortText(5, 140),
  agreedOutcome: shortText(5, 500),
  responsibleRole: shortText(3, 80),
  dateAgreed: dateField,
  targetDate: dateField,
  nextReviewDate: dateField,
  status: z.enum(ACTION_STATUSES),
  latestUpdate: shortText(5, 1000),
});

export const processSchema = z
  .object({
    processType: z.enum(["Not confirmed", "Union internal process", "Workplace procedure", "WRC referral", "Other confirmed process"]),
    referralDate: optionalDate,
    referenceNumber: z.string().trim().max(80).optional().or(z.literal("")),
    confirmationSource: z.string().trim().max(200).optional().or(z.literal("")),
    confirmationDate: optionalDate,
    requestedInformation: z.string().trim().max(1000).optional().or(z.literal("")),
    requestDate: optionalDate,
    requestedReplyDate: optionalDate,
    responseReceived: z.string().trim().max(1000).optional().or(z.literal("")),
    responsibleRole: z.string().trim().max(80).optional().or(z.literal("")),
    nextStep: z.string().trim().max(500).optional().or(z.literal("")),
    reviewDate: optionalDate,
  })
  .superRefine((value, context) => {
    if (value.processType === "WRC referral") {
      if (!value.confirmationSource || value.confirmationSource.trim().length < 5 || !value.confirmationDate) {
        context.addIssue({
          code: "custom",
          path: ["confirmationSource"],
          message: "A WRC referral can be recorded only with a confirmation source and date. Do not infer a stage from elapsed time.",
        });
      }
    }
  });

export const prioritySchema = z.object({
  outcome: shortText(8, 300),
  measure: shortText(8, 300),
  stage: shortText(3, 120),
  lastReview: dateField,
  agreement: shortText(20, 500),
});

export const privacySchema = z.object({
  controllerName: z.string().trim().min(3).max(160),
  controllerContact: z.string().trim().min(5).max(200),
  purposes: z.string().trim().min(20).max(2000),
  article6Basis: z.string().trim().min(20).max(2000),
  article9Condition: z.string().trim().min(20).max(2000),
  processors: z.string().trim().min(20).max(2000),
  hosting: z.string().trim().min(20).max(2000),
  transfers: z.string().trim().min(20).max(2000),
  retention: z.string().trim().min(20).max(2000),
  rightsProcedure: z.string().trim().min(20).max(2000),
  breachProcedure: z.string().trim().min(20).max(2000),
  dpiaAssessment: z.string().trim().min(20).max(2000),
  organisingStartDate: optionalDate,
  publishNotice: z.enum(["yes", "no"]),
});

export const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export type ConcernInput = z.infer<typeof concernSchema>;
export type IncidentInput = z.infer<typeof incidentSchema>;
export type SurveyInput = z.infer<typeof surveySchema>;
export type VolunteerInput = z.infer<typeof volunteerSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type ActionInput = z.infer<typeof actionSchema>;
export type ProcessInput = z.infer<typeof processSchema>;
export type PriorityInput = z.infer<typeof prioritySchema>;
export type PrivacyInput = z.infer<typeof privacySchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
