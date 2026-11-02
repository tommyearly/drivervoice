import Image from "next/image";
import Link from "next/link";
import { FEATURE_ICONS, PayIcon, PrivacyIcon, ProgressIcon, RosterIcon, TeamIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { FEATURES } from "@/lib/copy";
import { HEADLINE, INTRODUCTION, PRINCIPLES } from "./_forum-copy";

export default function HomePage() {
  return (
    <main id="main">
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal">Independent forum for Go-Ahead Ireland drivers</p>
          <h1 className="mt-4 max-w-xl font-serif text-4xl text-navy md:text-6xl">{HEADLINE}</h1>
      <div className="mt-4 grid gap-3 text-[var(--dv-muted)]"><p>A place for drivers to turn everyday concerns into clear questions, agreed priorities and practical follow-up. Taking part is voluntary. Different views are welcome.</p></div>
          <p className="mt-6 max-w-xl text-xl leading-relaxed">{INTRODUCTION}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sign-in" className="touch inline-flex items-center rounded-full bg-teal px-5 font-semibold text-white">Driver sign in</Link>
            <Link href="/our-plan" className="touch inline-flex items-center rounded-full border border-navy/20 bg-white px-5 font-semibold text-navy">How the plan works</Link>
          </div>
        </div>
        <figure>
          <div className="relative aspect-[4/3] overflow-hidden rounded-dv shadow-dv md:aspect-[5/4]">
            <Image
              src="/illustrations/hero.svg"
              alt="Illustration of fictional drivers beside a generic unbranded bus. It is not a photograph and not a record of a real event."
              fill
              priority
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover object-[center_62%]"
              unoptimized
            />
          </div>
          <figcaption className="mt-3 text-sm text-[var(--dv-muted)]">Illustration of fictional drivers and a generic bus. It is not a photograph and not evidence of a real event.</figcaption>
        </figure>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-16 md:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = FEATURE_ICONS[feature.icon];
          return (
            <Reveal key={feature.title}>
              <article className="dv-card h-full p-6">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/10 text-teal"><Icon className="h-7 w-7" /></span>
                <h2 className="mt-5 text-2xl">{feature.title}</h2>
                <p className="mt-3 text-[var(--dv-muted)]">{feature.body}</p>
              </article>
            </Reveal>
          );
        })}
      </section>
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-[0.8fr_1.2fr]">
          <h2 className="font-serif text-4xl">How we work</h2>
          <ul className="grid gap-4">
            {PRINCIPLES.map((principle) => (
              <li key={principle} className="border-l-4 border-amber pl-4 text-xl">{principle}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-16 sm:grid-cols-3">
        {[{ icon: PayIcon, label: "Pay" }, { icon: RosterIcon, label: "Rosters" }, { icon: PrivacyIcon, label: "Private records" }, { icon: TeamIcon, label: "Teamwork" }, { icon: ProgressIcon, label: "Progress" }].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-dv bg-white px-4 py-3">
            <item.icon className="h-8 w-8 text-teal" />
            <span className="font-semibold">{item.label}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
