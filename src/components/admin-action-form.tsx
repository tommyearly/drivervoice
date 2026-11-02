"use client";

import { useActionState } from "react";
import { saveActionAction } from "@/server/actions";

export function AdminActionForm({ disabled, mark, intro }: { disabled: boolean; mark?: React.ReactNode; intro?: React.ReactNode }) {
  const [state, action] = useActionState(saveActionAction, { ok: false, error: "" });
  return (
    <main id="main">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-serif text-4xl">Actions</h1>
        {mark}
      </div>
      {intro}
      <p className="mt-3">A missed date raises an “Update due” flag for drivers. It does not accuse anyone of refusing to act. Public release needs a separately written summary and a different publisher.</p>
      <form action={action} className="mt-6 grid gap-3">
        {(["title", "agreedOutcome", "responsibleRole", "latestUpdate"] as const).map((name) => (
          <label key={name} className="font-semibold capitalize">{name}
            <input name={name} className="dv-input mt-2" disabled={disabled} />
          </label>
        ))}
        <label>Date agreed<input type="date" name="dateAgreed" className="dv-input mt-2" disabled={disabled} /></label>
        <label>Target date<input type="date" name="targetDate" className="dv-input mt-2" disabled={disabled} /></label>
        <label>Next review<input type="date" name="nextReviewDate" className="dv-input mt-2" disabled={disabled} /></label>
        <label>Status
          <select name="status" className="dv-select mt-2" defaultValue="proposed" disabled={disabled}>
            {["proposed", "agreed", "in_progress", "awaiting_reply", "completed", "closed"].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <button className="touch w-fit rounded-full bg-teal px-4 font-semibold text-white disabled:opacity-50" disabled={disabled}>Save action</button>
        {state.ok ? <p role="status">Saved {state.data.reference}. It is not public.</p> : null}
        {!state.ok && state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
      </form>
    </main>
  );
}
