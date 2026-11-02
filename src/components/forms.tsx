"use client";

import { useActionState, useMemo } from "react";
import { useFormStatus } from "react-dom";
import { CONCERN_CONFIRMATION, INCIDENT_WARNING, OFF_DUTY_NOTICE, SURVEY_DISCLAIMER } from "@/lib/copy";
import { CONCERN_CATEGORIES, INCIDENT_CATEGORIES, SENSITIVE_INCIDENT, SURVEY_OPTIONS } from "@/lib/domain";
import {
  submitConcernAction,
  submitIncidentAction,
  submitQuestionAction,
  submitSurveyAction,
  submitVolunteerAction,
  updateProfileAction,
} from "@/server/actions";
import type { Result } from "@/lib/data/types";

function PendingButtons({ disabled, primary, secondary }: { disabled: boolean; primary: string; secondary?: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      {secondary ? (
        <button className="touch rounded-full border border-navy/20 px-5 font-semibold" name="intent" value="draft" disabled={disabled || pending}>
          {pending ? "Please wait" : secondary}
        </button>
      ) : null}
      <button className="touch rounded-full bg-teal px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" name="intent" value="submit" disabled={disabled || pending}>
        {pending ? "Please wait" : primary}
      </button>
    </div>
  );
}

function Errors({ state }: { state: Result<unknown> }) {
  if (state.ok || !state.fieldErrors) return null;
  return (
    <div className="rounded-dv border border-[#9b2c2c] bg-[#fff8f8] p-4" role="alert">
      <p className="font-semibold text-[#9b2c2c]">{state.error}</p>
      <ul className="mt-2 list-disc pl-5">
        {Object.entries(state.fieldErrors).map(([field, message]) => (
          <li key={field}><a href={`#field-${field}`}>{message}</a></li>
        ))}
      </ul>
    </div>
  );
}

function TextField({ name, label, error, hint, as = "input", type = "text" }: { name: string; label: string; error?: string; hint?: string; as?: "input" | "textarea"; type?: string }) {
  const id = `field-${name}`;
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const className = as === "textarea" ? "dv-textarea" : "dv-input";
  return (
    <label className="block" htmlFor={id}>
      <span className="font-semibold">{label}</span>
      {hint ? <span id={`${id}-hint`} className="mt-1 block text-base text-[var(--dv-muted)]">{hint}</span> : null}
      {as === "textarea" ? (
        <textarea id={id} name={name} className={`${className} mt-2`} aria-invalid={Boolean(error)} aria-describedby={described} autoComplete="off" />
      ) : (
        <input id={id} name={name} type={type} className={`${className} mt-2`} aria-invalid={Boolean(error)} aria-describedby={described} autoComplete="off" />
      )}
      {error ? <span id={`${id}-error`} className="field-error mt-1 block">Error: {error}</span> : null}
    </label>
  );
}

export function ConcernForm({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(submitConcernAction, { ok: false, error: "" });
  const key = useMemo(() => crypto.randomUUID(), []);
  const errors = state.ok ? {} : state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-6" noValidate>
      <p className="rounded-dv bg-amber/20 p-4 font-semibold text-navy">{OFF_DUTY_NOTICE}</p>
      <p>Include only the details needed to explain the issue. Avoid naming passengers, colleagues or managers unless necessary for private follow-up.</p>
      <p className="text-[var(--dv-muted)]">Who can see this: you, a coordinator for allocation, and a reviewer if one is assigned. Editors, publishers and the technical administrator do not receive it through those roles. It is not published. {`This is not an anonymous or legally privileged channel.`}</p>
      <Errors state={state.ok ? { ok: false, error: "" } : state} />
      {state.ok && state.data.status !== "draft" ? <p className="rounded-dv bg-teal/10 p-4" role="status">{CONCERN_CONFIRMATION} Reference {state.data.reference}.</p> : null}
      {state.ok && state.data.status === "draft" ? <p role="status">Draft reference {state.data.reference} is stored for your account. It has not been submitted for review.</p> : null}
      {!state.ok && state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
      <input type="hidden" name="idempotencyKey" value={key} />
      <label className="block font-semibold" htmlFor="field-category">Category
        <select id="field-category" name="category" className="dv-select mt-2" defaultValue="Rosters">
          {CONCERN_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <TextField name="title" label="Short title" error={errors.title} />
      <TextField name="eventDate" label="Date or start date" type="date" error={errors.eventDate} />
      <TextField name="eventDateEnd" label="End date, if there is a range" type="date" />
      <TextField name="depotContext" label="Optional depot or shift context" hint="Use a broad description. Do not include a vehicle registration." />
      <TextField name="whatHappened" label="What happened?" as="textarea" error={errors.whatHappened} />
      <TextField name="personallyObserved" label="What did you personally observe?" as="textarea" error={errors.personallyObserved} />
      <TextField name="needsChecking" label="What needs checking?" as="textarea" error={errors.needsChecking} />
      <TextField name="effectOnWork" label="Effect on your work" as="textarea" error={errors.effectOnWork} />
      <TextField name="outcomeRequested" label="Outcome requested" as="textarea" error={errors.outcomeRequested} />
      <fieldset>
        <legend className="font-semibold">Have you used an official reporting channel?</legend>
        {["yes", "no", "unsure"].map((value) => (
          <label key={value} className="mt-2 flex min-h-11 items-center gap-3"><input type="radio" name="officialChannelUsed" value={value} defaultChecked={value === "unsure"} /> {value === "unsure" ? "Not sure" : value === "yes" ? "Yes" : "No"}</label>
        ))}
      </fieldset>
      <TextField name="officialReference" label="Optional official reference" />
      <label className="block font-semibold" htmlFor="field-contactMethod">Preferred contact method
        <select id="field-contactMethod" name="contactMethod" className="dv-select mt-2" defaultValue="account">
          <option value="account">Through this account</option>
          <option value="phone">Phone</option>
          <option value="email">Email</option>
        </select>
      </label>
      <TextField name="contactDetail" label="Phone or email, if you chose one" />
      <label className="flex min-h-11 items-start gap-3"><input className="mt-1 h-5 w-5" type="checkbox" name="acknowledgement" value="yes" /> <span>I understand this is a private report to the committee. It is not an official company, union or WRC submission.</span></label>
      {disabled ? <p className="font-semibold">Saving is turned off until the service is configured. Nothing you type will be stored.</p> : null}
      <PendingButtons disabled={disabled} primary="Submit concern" secondary="Save draft" />
    </form>
  );
}

export function IncidentForm({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(submitIncidentAction, { ok: false, error: "" });
  const key = useMemo(() => crypto.randomUUID(), []);
  return (
    <form action={action} className="grid gap-6" noValidate>
      <p className="rounded-dv border-2 border-[#9b2c2c] bg-[#fff8f8] p-4 font-semibold" role="note">{INCIDENT_WARNING}</p>
      <p className="font-semibold">{OFF_DUTY_NOTICE}</p>
      <p>Do not include passenger identities, children’s details, medical histories, CCTV, witness lists or detailed accident files. For injury, disciplinary or third-party matters, this form keeps a short callback request only.</p>
      <input type="hidden" name="idempotencyKey" value={key} />
      {!state.ok && state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
      {state.ok ? <p role="status">Reference {state.data.reference} has status {state.data.status}. This is a private follow-up record, not an official incident report.</p> : null}
      <TextField name="eventDate" label="Event date" type="date" />
      <TextField name="eventTime" label="Approximate time" hint="Use 24-hour HH:MM, or leave blank." />
      <label className="font-semibold" htmlFor="field-incident-category">General category
        <select id="field-incident-category" name="category" className="dv-select mt-2" defaultValue="Service or duty">
          {INCIDENT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <TextField name="routeOrDuty" label="Optional route or duty reference" hint="Do not add a vehicle registration." />
      <fieldset>
        <legend className="font-semibold">Has official reporting happened?</legend>
        {["yes", "no", "unsure"].map((value) => (
          <label key={value} className="mt-2 flex min-h-11 items-center gap-3"><input type="radio" name="officialChannelUsed" value={value} defaultChecked={value === "unsure"} /> {value}</label>
        ))}
      </fieldset>
      <TextField name="officialReference" label="Optional official reference" />
      <TextField name="summary" label="Brief factual summary" as="textarea" hint="Leave this blank for injury, disciplinary or third-party callback requests." />
      <TextField name="outstanding" label="Outstanding issue" as="textarea" />
      <TextField name="supportRequested" label="Support or follow-up requested" as="textarea" hint={`Sensitive categories: ${SENSITIVE_INCIDENT.join(", ")}. Ask for a callback without medical or third-party details.`} />
      <label className="font-semibold" htmlFor="field-incident-contact">Preferred contact
        <select id="field-incident-contact" name="contactMethod" className="dv-select mt-2" defaultValue="account">
          <option value="account">Through this account</option>
          <option value="phone">Phone</option>
          <option value="email">Email</option>
        </select>
      </label>
      <TextField name="contactDetail" label="Phone or email, if needed" />
      <label className="flex min-h-11 items-start gap-3"><input className="mt-1 h-5 w-5" type="checkbox" name="acknowledgement" value="yes" /> <span>I understand this is a private follow-up record and does not replace official reporting.</span></label>
      {disabled ? <p className="font-semibold">Saving is turned off. Document uploads are also disabled.</p> : null}
      <PendingButtons disabled={disabled} primary="Save follow-up record" secondary="Save draft" />
    </form>
  );
}

export function SurveyForm({ disabled, current }: { disabled: boolean; current: { first: string; second: string; third: string; otherText: string } | null }) {
  const [state, action] = useActionState(submitSurveyAction, { ok: false, error: "" });
  return (
    <form action={action} className="grid gap-5">
      <p className="font-semibold">{SURVEY_DISCLAIMER}</p>
      <p>Your answers are linked to your account so each driver can respond once. Only the survey administrator can see your ranking. This is not an anonymous survey.</p>
      {state.ok ? <p role="status">Your response has been saved. You can change it until the survey closes.</p> : null}
      {!state.ok && state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
      {(["first", "second", "third"] as const).map((rank, index) => (
        <label key={rank} className="font-semibold">Choice {index + 1}
          <select name={rank} className="dv-select mt-2" defaultValue={current?.[rank] || SURVEY_OPTIONS[index]}>
            {SURVEY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      ))}
      <TextField name="otherText" label="If you chose Other, describe it briefly" hint="This description is not published." />
      <button className="touch w-fit rounded-full bg-teal px-5 font-semibold text-white disabled:opacity-50" disabled={disabled}>Save survey response</button>
    </form>
  );
}

export function VolunteerForm({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(submitVolunteerAction, { ok: false, error: "" });
  return (
    <form action={action} className="grid gap-5">
      <p>Applying does not appoint you. Contact details are not published. A short profile is published only with your consent and a separate approval.</p>
      {state.ok ? <p role="status">Your application has been received. It does not make you a committee member.</p> : null}
      {!state.ok && state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
      <TextField name="name" label="Name" />
      <TextField name="contact" label="Preferred contact details" />
      <TextField name="depot" label="Optional depot" />
      <TextField name="shiftPattern" label="Optional broad shift pattern" />
      <label className="font-semibold">Preferred role
        <select name="preferredRole" className="dv-select mt-2" defaultValue="Communications lead">
          {["Coordinator", "Evidence and records lead", "Union liaison", "Communications lead", "Driver participation lead"].map((role) => <option key={role}>{role}</option>)}
        </select>
      </label>
      <TextField name="statement" label="Short statement" as="textarea" />
      <fieldset>
        <legend className="font-semibold">May a short candidate profile be considered for publication later?</legend>
        <label className="mt-2 flex min-h-11 items-center gap-3"><input type="radio" name="consentProfile" value="no" defaultChecked /> No</label>
        <label className="flex min-h-11 items-center gap-3"><input type="radio" name="consentProfile" value="yes" /> Yes, without contact details</label>
      </fieldset>
      <button className="touch w-fit rounded-full bg-teal px-5 font-semibold text-white disabled:opacity-50" disabled={disabled}>Submit application</button>
    </form>
  );
}

export function QuestionForm({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(submitQuestionAction, { ok: false, error: "" });
  return (
    <form action={action} className="grid gap-5">
      <p>Questions are private by default. A coordinator can read them. They are not posted on the website.</p>
      <input className="hidden" tabIndex={-1} autoComplete="off" name="companyWebsite" defaultValue="" />
      {state.ok ? <p role="status">Your question has been recorded privately. Reference {state.data.reference}.</p> : null}
      {!state.ok && state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
      <TextField name="pageRef" label="Relevant page or update" />
      <TextField name="question" label="Question or correction" as="textarea" />
      <TextField name="explanation" label="Supporting explanation" as="textarea" />
      <TextField name="contactPreference" label="Optional contact preference" />
      <button className="touch w-fit rounded-full bg-teal px-5 font-semibold text-white disabled:opacity-50" disabled={disabled}>Send privately</button>
    </form>
  );
}

export function ProfileForm({ disabled, name }: { disabled: boolean; name: string }) {
  const [state, action] = useActionState(updateProfileAction, { ok: false, error: "" });
  return (
    <form action={action} className="grid gap-4">
      {state.ok ? <p role="status">Your account details have been updated.</p> : null}
      {!state.ok && state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
      <label className="font-semibold">Display name
        <input name="displayName" className="dv-input mt-2" defaultValue={name} />
      </label>
      <label className="font-semibold">Contact preference
        <select name="contactPreference" className="dv-select mt-2" defaultValue="account">
          <option value="account">Through this account</option>
          <option value="phone">Phone</option>
          <option value="email">Email</option>
        </select>
      </label>
      <label className="font-semibold">Email when an approved update is published?
        <select name="emailUpdates" className="dv-select mt-2" defaultValue="no">
          <option value="no">No</option>
          <option value="yes">Yes, headline and link only</option>
        </select>
      </label>
      <button className="touch w-fit rounded-full bg-navy px-5 font-semibold text-white disabled:opacity-50" disabled={disabled}>Save account details</button>
    </form>
  );
}
