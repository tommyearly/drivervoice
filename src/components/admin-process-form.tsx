"use client";

import { useActionState } from "react";
import { saveProcessAction } from "@/server/actions";

export function AdminProcessForm({ disabled, mark, intro }: { disabled: boolean; mark?: React.ReactNode; intro?: React.ReactNode }) {
  const [state, action] = useActionState(saveProcessAction, { ok: false, error: "" });
  return (
    <main id="main">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-serif text-4xl">Union and WRC process tracker</h1>
        {mark}
      </div>
      {intro}
      <p className="mt-3">This record is restricted. Do not infer a WRC stage from how much time has passed. References, offers and negotiation notes entered here are not copied to a public page. Any member or public update has to be written and approved separately.</p>
      <form action={action} className="mt-6 grid gap-3">
        <label>Process type
          <select name="processType" className="dv-select mt-2" defaultValue="Not confirmed" disabled={disabled}>
            {["Not confirmed", "Union internal process", "Workplace procedure", "WRC referral", "Other confirmed process"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        {[["referralDate", "Referral date"], ["confirmationDate", "Confirmation date"], ["requestDate", "Request date"], ["requestedReplyDate", "Requested reply date"], ["reviewDate", "Review date"]].map(([name, label]) => (
          <label key={name}>{label}<input type="date" name={name} className="dv-input mt-2" disabled={disabled} /></label>
        ))}
        <label>Restricted reference<input name="referenceNumber" className="dv-input mt-2" disabled={disabled} /></label>
        <label>Source of confirmation<textarea name="confirmationSource" className="dv-textarea mt-2" disabled={disabled} /></label>
        <label>Requested information<textarea name="requestedInformation" className="dv-textarea mt-2" defaultValue="Referral date, reference where available, claims submitted, current stage, relevant dates and next steps." disabled={disabled} /></label>
        <label>Response received<textarea name="responseReceived" className="dv-textarea mt-2" disabled={disabled} /></label>
        <label>Responsible role<input name="responsibleRole" className="dv-input mt-2" defaultValue="Union liaison (proposed role)" disabled={disabled} /></label>
        <label>Next step<textarea name="nextStep" className="dv-textarea mt-2" disabled={disabled} /></label>
        <button className="touch w-fit rounded-full bg-navy px-4 font-semibold text-white disabled:opacity-50" disabled={disabled}>Save restricted entry</button>
        {state.ok ? <p role="status">The restricted entry has been saved. It has not been published.</p> : null}
        {!state.ok && state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
      </form>
    </main>
  );
}
