/**
 * New SCTR job page for the SCTR Insurance Document Generator.
 *
 * This server component initializes the document-generation workflow for the
 * insurer selected on the previous page.
 *
 * Responsibilities:
 * - Resolve the active language from the URL query parameters.
 * - Read and normalize the selected insurer from the URL.
 * - Display the localized page heading and selected-insurer summary.
 * - Preserve the active language when navigating back to insurer selection.
 * - Render the Excel upload and validation workflow through `UploadTrama`.
 */

import Link from "next/link";
import { Suspense } from "react";
import UploadTrama from "./UploadTrama";
import LanguageToggle from "@/components/LanguageToggle";
import { getLang, text } from "@/lib/i18n";

/**
 * Shape of the search parameters supplied by the Next.js App Router.
 */
type SP = Record<string, string | string[] | undefined>;

/**
 * Converts an insurer route key into a user-friendly display label.
 *
 * Unknown values are returned unchanged so the page can still display the
 * supplied insurer identifier instead of failing.
 *
 * @param value - Insurer identifier read from the URL.
 * @returns The insurer name displayed in the page heading.
 */
function insurerLabel(value: string) {
  if (value === "rimac") return "Rimac";
  if (value === "mapfre") return "Mapfre";
  if (value === "lapositiva") return "La Positiva";

  return value;
}

/**
 * Displays the upload workflow for a newly selected insurer.
 *
 * @param searchParams - Optional URL parameters containing insurer and language.
 * @returns The localized new-job page and Excel upload component.
 */
export default async function NewJobPage({
  searchParams,
}: {
  searchParams?: SP | Promise<SP>;
}) {
  /*
   * Support both synchronous and asynchronous search-parameter values, then
   * normalize a missing value to an empty object.
   */
  const sp = (await Promise.resolve(searchParams)) ?? {};

  /*
   * Resolve the active application language and load translations for the job
   * creation workflow.
   */
  const lang = getLang(sp.lang);
  const t = text[lang].jobs;

  /*
   * Next.js query parameters may be a string or an array. Use the first value
   * when an array is supplied and fall back to `unknown` when no insurer was
   * selected.
   */
  const insurerParam = sp.insurer;
  const insurer = Array.isArray(insurerParam)
    ? insurerParam[0]
    : insurerParam ?? "unknown";

  return (
    <main className="relative isolate h-dvh overflow-y-auto overflow-x-hidden bg-zinc-950 px-4 py-6 font-sans text-zinc-100 sm:px-6 lg:px-8">
      {/*
       * The language toggle contains client-side navigation behavior and is
       * wrapped in Suspense for compatibility with App Router rendering.
       */}
      <Suspense fallback={null}>
        <LanguageToggle lang={lang} />
      </Suspense>

      <section className="mx-auto w-full max-w-7xl pb-16">
        {/* Navigation and localized section label. */}
        <div className="flex items-center gap-4">
          <Link
            href={`/insurers?lang=${lang}`}
            className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold uppercase text-zinc-100 transition hover:border-teal-300/40 hover:text-white"
          >
            {t.back}
          </Link>

          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-200">
            {t.eyebrow}
          </div>
        </div>

        {/* Page heading and selected-insurer summary. */}
        <div className="mt-5">
          <h1 className="text-4xl font-black tracking-[-0.05em] text-zinc-50 sm:text-5xl">
            {t.title}
          </h1>

          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
            {t.selectedInsurer}{" "}
            <span className="font-bold text-zinc-100">
              {insurerLabel(insurer)}
            </span>
          </p>
        </div>

        {/*
         * Delegate Excel upload, parsing, validation, checkout, and document
         * generation to the client workflow component.
         */}
        <UploadTrama insurer={insurer} lang={lang} />
      </section>
    </main>
  );
}