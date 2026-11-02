import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/chrome";
import { PageIllustration } from "@/components/page-illustration";
import { INDEPENDENCE_NOTICE } from "@/lib/copy";
import { TERMS_VERSION } from "@/lib/consent";

export const metadata: Metadata = { title: "Terms and conditions" };

const sections = [
  {
    title: "What you are agreeing to",
    body: "These terms cover use of the Drivers Voice website, an invited driver account, and optional WhatsApp contact with a coordinator. They are the forum’s house rules. They are not a contract of employment, a union membership form, or legal advice.",
  },
  {
    title: "Who runs this forum",
    body: INDEPENDENCE_NOTICE,
  },
  {
    title: "Accounts",
    body: "Access is by invitation. Asking for a sign-in link does not by itself confirm that you are eligible. A coordinator confirms eligibility separately. You agree to use your own email address, keep sign-in links to yourself, and tell the forum if you should no longer have access.",
  },
  {
    title: "Mobile number and WhatsApp",
    body: "Finishing signup means giving a mobile number and agreeing that a coordinator may message that number on WhatsApp about your account and forum business. The number is visible to coordinators and the technical administrator. It is not published. WhatsApp is operated by Meta, so a message leaves this website. Do not send medical information, incident files, or confidential negotiation papers there. The chat is not monitored for emergencies.",
  },
  {
    title: "Taking part",
    body: "Participation is voluntary. The code of conduct applies to forms, updates, and any message you send the forum. You will not use the site to harass anyone, publish an identifiable accusation, or pressure another driver about voting or union membership. These terms do not remove a lawful right to seek advice, raise a grievance, or contact a representative, regulator, or public authority.",
  },
  {
    title: "No emergency or official filing",
    body: "Nothing sent through this website or WhatsApp is an accident report, a company grievance, a protected disclosure, or a Workplace Relations Commission complaint. Statutory deadlines are not paused because a message was sent here.",
  },
  {
    title: "Privacy",
    body: "The privacy notice explains what the forum records and the rights you may have. Where a step relies on consent, including WhatsApp contact, you may withdraw it by writing to the controller named in that notice or by asking for the mobile number to be removed. Earlier lawful handling is not undone by that request. A preservation hold can mean a record is kept.",
  },
  {
    title: "Changes",
    body: `These terms are version ${TERMS_VERSION}. If they change in a way that affects your account, you will be asked to accept the new version before sending another form. If you do not accept them, do not request a sign-in link and do not save a mobile number.`,
  },
];

export default function TermsPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-14">
      <PageIllustration asset="conduct" variant="legal" />
      <PageIntro
        eyebrow="Terms"
        title="Terms and conditions"
        lede="Read this before you request a sign-in link or give the forum a mobile number."
      />
      <div className="clear-both mt-8 grid gap-4">
        {sections.map((section) => (
          <article key={section.title} className="dv-card p-5">
            <h2 className="text-2xl">{section.title}</h2>
            <p className="mt-3 text-[var(--dv-muted)]">{section.body}</p>
          </article>
        ))}
        <p className="text-[var(--dv-muted)]">
          Related pages: <Link className="underline" href="/privacy">Privacy</Link>, <Link className="underline" href="/cookies">Cookies</Link>, <Link className="underline" href="/code-of-conduct">Conduct</Link>, and <Link className="underline" href="/sign-in">Driver sign in</Link>.
        </p>
      </div>
    </main>
  );
}
