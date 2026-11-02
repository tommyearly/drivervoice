import type { Metadata } from "next";
import { PageIntro } from "@/components/chrome";
import { PageIllustration } from "@/components/page-illustration";
import { QuestionForm } from "@/components/forms";
import { getRepository } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const store = getRepository();
  const open = await store.collectionState();
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-14">
      <PageIntro eyebrow="Contact" title="Ask a question or request a correction" lede="Ask about Drivers Voice or request a correction. This form does not publish your message. Please read the privacy notice before sharing personal information." />
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
        <p>Use this form for a question about the forum or a correction to website content. Signed-in drivers should use the workplace-concern form for an individual employment issue. Passenger service queries belong on the <a className="underline" href="https://www.goaheadireland.ie/" rel="external noreferrer">company’s official website</a>.</p>
        <p>This inbox is not an emergency channel. Avoid sending incident files, medical information or confidential negotiation material.</p>
      </div>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <QuestionForm disabled={!open} />
        <PageIllustration asset="contact" variant="form" className="order-first lg:order-none" caption="Conceptual illustration. People are fictional; this does not depict a real event." />
      </div>
    </main>
  );
}
