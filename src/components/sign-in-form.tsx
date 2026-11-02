"use client";

import { useActionState } from "react";
import { DEMO_USER_IDS } from "@/lib/auth/demo-token";
import { demoSignInAction, requestLinkAction } from "@/server/actions";

const labels: Record<string, string> = {
  "demo-driver-a": "Alex Brennan, driver A (fictional)",
  "demo-driver-b": "Sam Kehoe, driver B (fictional)",
  "demo-reviewer": "Jordan Ellis, reviewer (fictional)",
  "demo-coordinator": "Riley Quinn, coordinator (fictional)",
  "demo-editor": "Casey Moore, editor (fictional)",
  "demo-publisher": "Morgan Daly, publisher (fictional)",
  "demo-tech": "Technical administrator (fictional)",
  "demo-survey": "Survey administrator (fictional)",
  "demo-pending": "Pending invitation (fictional)",
};

export function SignInForm({ demonstration }: { demonstration: boolean }) {
  const [state, action, pending] = useActionState(requestLinkAction, { ok: false, error: "" });
  return (
    <>
      <form action={action} className="dv-card mt-8 grid gap-4 p-5">
        <label className="font-semibold" htmlFor="email">Email address
          <input id="email" name="email" type="email" autoComplete="email" className="dv-input mt-2" />
        </label>
        <button className="touch w-fit rounded-full bg-teal px-5 font-semibold text-white" disabled={pending}>{pending ? "Sending" : "Email me a sign-in link"}</button>
        {state.ok ? <p role="status">If this email has been invited, a sign-in link is on its way. It does not contain any report.</p> : null}
        {!state.ok && state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
      </form>
      {demonstration ? (
        <section className="mt-10">
          <h2 className="text-2xl">Demonstration accounts</h2>
          <p className="mt-2">These fictional accounts only work in demonstration mode. Choosing one does not save a report.</p>
          <div className="mt-4 grid gap-2">
            {DEMO_USER_IDS.map((id) => (
              <form key={id} action={demoSignInAction}>
                <input type="hidden" name="demoUser" value={id} />
                <button className="touch w-full rounded-dv border border-navy/15 bg-white px-4 text-left font-semibold">{labels[id]}</button>
              </form>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
