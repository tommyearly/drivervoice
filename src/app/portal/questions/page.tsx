import { redirect } from "next/navigation";
import { PageIllustration } from "@/components/page-illustration";
import { QuestionForm } from "@/components/forms";
import { getSessionActor } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";

export const metadata = { title: "Questions" };

export default async function QuestionsPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/sign-in");
  const store = getRepository();
  const [open, own] = await Promise.all([store.collectionState(), store.listOwnQuestions(actor)]);
  return (
    <main id="main">
      <h1 className="font-serif text-4xl">Questions and corrections</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]">
        <p>Ask how the forum works, request clarification or identify something that needs correcting. Give the page title or update reference where possible. Your message is a request for review, not a public comment.</p>
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <QuestionForm disabled={!open} />
        <PageIllustration asset="contact" variant="form" className="order-first lg:order-none" />
      </div>
      <h2 className="mt-8 text-2xl">Your questions</h2>
      {own.length === 0 ? <p className="mt-2">None yet.</p> : <ul className="mt-3 grid gap-2">{own.map((item) => <li key={item.id} className="dv-card p-4">{item.reference}: {item.question}</li>)}</ul>}
    </main>
  );
}
