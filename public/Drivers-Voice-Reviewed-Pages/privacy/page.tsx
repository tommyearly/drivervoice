import type { Metadata } from "next";
import { PageIntro } from "@/components/chrome";
import { INDEPENDENCE_NOTICE, NOT_ANONYMOUS } from "../_forum-copy";
import { getRepository } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const notice = await getRepository().getPublicPrivacy();
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-14">
      <PageIntro eyebrow="Privacy" title="How records are handled" lede={NOT_ANONYMOUS} />
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>Please read the current privacy notice before using a form. Signing in identifies your account; this service is not anonymous. Access restrictions reduce exposure but do not provide absolute confidentiality or legal privilege.</p></div>
      <div className="mt-8 grid gap-5">
        {notice ? (
          <article className="dv-card p-5">
            <h2 className="text-2xl">Published controller notice</h2>
            <p className="mt-3">Controller: {notice.controllerName}</p>
            <p>Contact: {notice.controllerContact}</p>
            <p className="mt-3">{notice.purposes}</p>
            <p className="mt-3">Article 6 basis recorded by the controller: {notice.article6Basis}</p>
            <p className="mt-3">Article 9 condition recorded by the controller: {notice.article9Condition}</p>
            <p className="mt-3">Processors: {notice.processors}</p>
            <p>Hosting: {notice.hosting}</p>
            <p>Transfers: {notice.transfers}</p>
            <p className="mt-3">Retention: {notice.retention}</p>
            <p>Rights requests: {notice.rightsProcedure}</p>
            <p>For a privacy or security concern, contact the published controller using the details above.</p>
            
          </article>
        ) : (
          <p className="rounded-dv bg-white p-5">Personal-information submissions are not ready to open. The forum operator must publish its identity, contact details and privacy arrangements first. Please do not send personal documents or sensitive details in the meantime.</p>
        )}
        <section>
          <h2 className="text-2xl">Intended access to records</h2>
          <p className="mt-3">The operator must check these limits against the live system and explain any other necessary recipients before collection opens. These are access rules, not a promise of absolute secrecy.</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>A workplace concern is visible to the driver who wrote it, a coordinator, and a reviewer only after assignment.</li>
            <li>An editor or publisher does not receive the concern through that role. A technical administrator manages accounts and does not receive report content through that role.</li>
            <li>An incident follow-up uses the same limits. Sensitive categories keep a short callback request rather than a detailed file.</li>
            <li>Survey rankings are visible to the driver and the survey administrator. Other roles see an approved total only when small groups are suppressed.</li>
            <li>Volunteer contact details are visible to the coordinator handling applications and are not published.</li>
            <li>Questions and corrections are private to the driver and a coordinator.</li>
          </ul>
        </section>
        <p>Target response times are organisational goals, not guarantees. Retention and deletion requests are assessed where a record must lawfully be kept. A preservation hold stops deletion.</p>
        <p>Search settings, a shared password or redaction do not by themselves make a record anonymous or secure. Private pages require an authenticated, authorised account.</p>
        <section><h2 className="text-2xl">Your privacy rights</h2><p className="mt-3">Depending on the circumstances, you may have rights to access, correct, erase or restrict use of your information, to object to processing, and to receive portable data. Where processing relies on consent, you may withdraw it without affecting earlier lawful processing. Contact the controller listed above to exercise your rights. You may also complain to the <a className="underline text-teal" href="https://www.dataprotection.ie/">Data Protection Commission</a>.</p><p className="mt-3">Check the published notice for the information collected, who receives it, how long it is kept, any overseas transfers and any applicable automated decision-making. If those details are missing or unclear, ask before submitting. Removing a name does not necessarily make a record anonymous.</p></section>
        <p>{INDEPENDENCE_NOTICE}</p>
      </div>
    </main>
  );
}
