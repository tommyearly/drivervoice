"use client";

import Link from "next/link";
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
          <input id="email" name="email" type="email" autoComplete="email" required className="dv-input mt-2" />
        </label>
        <label className="font-semibold" htmlFor="mobile">Mobile for WhatsApp
          <span className="mt-1 block font-normal text-[var(--dv-muted)]">A coordinator uses this to reach you about the forum. Start with 08, or add the country code. It is saved on your account after you sign in.</span>
          <input id="mobile" name="mobile" type="tel" inputMode="tel" autoComplete="tel" required className="dv-input mt-2" placeholder="087 000 0000" />
        </label>
        <label className="flex items-start gap-3 font-normal">
          <input className="mt-1 h-5 w-5" type="checkbox" name="whatsapp" value="yes" required />
          <span>A coordinator may contact this number on WhatsApp. The chat is not monitored for emergencies.</span>
        </label>
        <label className="flex items-start gap-3 font-normal">
          <input className="mt-1 h-5 w-5" type="checkbox" name="terms" value="yes" required />
          <span>I accept the <Link className="font-semibold underline" href="/terms">terms and conditions</Link>. I have also read the <Link className="font-semibold underline" href="/privacy">privacy notice</Link>.</span>
        </label>
        <button className="touch w-fit rounded-full bg-teal px-5 font-semibold text-white" disabled={pending}>{pending ? "Sending" : "Email me a sign-in link"}</button>
        {state.ok ? <p role="status">If this email has been invited, a sign-in link is on its way. It does not contain any report. After you sign in, save the mobile number on your account.</p> : null}
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
