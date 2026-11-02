import Link from "next/link";

export const metadata = { title: "Page not available" };

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-20">
      <h1 className="font-serif text-4xl">That page is not available</h1>
      <p className="mt-4">The address may be wrong, or the record is not visible to this account. Nothing from a private report is shown here.</p>
      <Link href="/" className="touch mt-6 inline-flex items-center rounded-full bg-teal px-5 font-semibold text-white">Back to the homepage</Link>
    </main>
  );
}
