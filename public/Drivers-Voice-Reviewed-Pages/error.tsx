"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-20">
      <h1 className="font-serif text-4xl">This page could not be loaded</h1>
      <p className="mt-4">Nothing you submitted is shown in this message. You can try again.</p>
      <button className="touch mt-6 rounded-full bg-navy px-5 font-semibold text-white" onClick={() => reset()}>Try again</button>
    </main>
  );
}
