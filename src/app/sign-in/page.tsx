import type { Metadata } from "next";
import { PageIllustration } from "@/components/page-illustration";
import { SignInForm } from "@/components/sign-in-form";
import { resolveMode } from "@/lib/domain";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default function SignInPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-14">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div>
          <h1 className="font-serif text-4xl">Driver sign in</h1>
          <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
            <p>Use the email address linked to your invitation. Do not use a company payroll, staff-portal or union password. Access approval confirms eligibility for this forum only; it does not confirm union membership or a representative appointment.</p>
          </div>
          <p className="mt-4 text-xl">Access is by invitation. Signing in does not confirm eligibility, and this is not an official company or union account.</p>
          <SignInForm demonstration={resolveMode(process.env) !== "live"} />
        </div>
        <PageIllustration asset="privacy" variant="form" className="order-first lg:order-none lg:mt-2" />
      </div>
    </main>
  );
}
