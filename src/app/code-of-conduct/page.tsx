import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/chrome";
import { PageIllustration } from "@/components/page-illustration";

export const metadata: Metadata = { title: "Code of conduct" };

const rules = [
  "Be factual and respectful.",
  "Distinguish first-hand knowledge from information received from others.",
  "No threats, harassment, personal abuse or pressure over voting.",
  "No public accusations against identifiable individuals.",
  "Do not upload confidential negotiation material or unnecessary personal information.",
  "Corrections and responses must be handled fairly.",
  "Formal representation and industrial action follow applicable procedures.",
  "Do not share another person’s report, identity or contact details outside the authorised process.",
  "Disagree with an idea without targeting the person who raised it. No pressure to join, vote, volunteer or disclose union membership.",
  "Moderators may withhold or remove content for a stated reason and allow a correction or review request. Do not delete or alter evidence subject to lawful preservation.",
  "These rules do not prevent lawful reporting, seeking advice, participating in union activity or exercising employment rights.",
];

export default function ConductPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-14">
      <PageIllustration asset="conduct" variant="legal" />
      <PageIntro eyebrow="Conduct" title="How we treat records and each other" lede="These rules apply to the forum, the private forms and any update written from them." />
      <div className="clear-both mt-4 grid gap-3 text-[var(--dv-muted)]">
        <p>Drivers may disagree, question decisions and raise concerns respectfully. These rules protect fair participation; they must not be used to suppress a good-faith concern or lawful contact with a representative, adviser, regulator or public authority.</p>
      </div>
      <ul className="mt-8 grid gap-3">
        {rules.map((rule) => <li key={rule} className="dv-card p-4 text-lg">{rule}</li>)}
      </ul>
      <p className="mt-6 text-[var(--dv-muted)]">The same standard applies to a WhatsApp message with a coordinator. The <Link className="underline" href="/terms">terms and conditions</Link> have to be accepted before a driver account can send a form.</p>
    </main>
  );
}
