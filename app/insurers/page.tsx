/**
 * Insurer-selection page for the SCTR Insurance Document Generator.
 *
 * This server component displays the supported insurance providers and lets the
 * user choose which insurer-specific SCTR workflow to start.
 *
 * Responsibilities:
 * - Resolve the active application language from the URL query parameters.
 * - Load translated labels and insurer descriptions.
 * - Display the supported insurer cards and logos.
 * - Preserve the selected language when navigating backward or starting a job.
 * - Route the user to the insurer-specific document-upload workflow.
 */

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import LanguageToggle from "@/components/LanguageToggle";
import { getLang, text } from "@/lib/i18n";

/**
 * Shape of the search parameters supplied by the Next.js App Router.
 */
type SP = Record<string, string | string[] | undefined>;

/**
 * UI configuration for one supported insurer.
 */
type InsurerCard = {
  /**
   * Stable insurer identifier used in route query parameters.
   */
  key: string;

  /**
   * Human-readable insurer name displayed to the user.
   */
  name: string;

  /**
   * Localized description explaining the insurer workflow.
   */
  description: string;

  /**
   * Logo asset and its intrinsic dimensions for Next.js image optimization.
   */
  logo: {
    src: string;
    w: number;
    h: number;
  };
};

/**
 * Displays the supported insurers and routes the user to a new SCTR job.
 *
 * @param searchParams - Optional URL query parameters used to resolve language.
 * @returns The localized insurer-selection page.
 */
export default async function InsurersPage({
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
   * Resolve the application's supported language and load the translations for
   * this page.
   */
  const lang = getLang(sp.lang);
  const t = text[lang].insurers;

  /*
   * Define the supported insurers and their presentation metadata. Localized
   * descriptions are applied after the active language has been resolved.
   */
  const insurers: InsurerCard[] = [
    {
      key: "rimac",
      name: "Rímac",
      description: t.descriptions.rimac,
      logo: {
        src: "/pdf-assets/logos/rimac.png",
        w: 220,
        h: 90,
      },
    },
    {
      key: "lapositiva",
      name: "La Positiva",
      description: t.descriptions.lapositiva,
      logo: {
        src: "/pdf-assets/logos/lapositiva.png",
        w: 240,
        h: 90,
      },
    },
    {
      key: "mapfre",
      name: "MAPFRE Perú",
      description: t.descriptions.mapfre,
      logo: {
        src: "/pdf-assets/logos/mapfre_peru.png",
        w: 260,
        h: 90,
      },
    },
  ];

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-zinc-950 px-6 py-10 font-sans text-zinc-100">
      {/*
       * The language toggle reads navigation state on the client, so it is
       * wrapped in Suspense to support App Router rendering requirements.
       */}
      <Suspense fallback={null}>
        <LanguageToggle lang={lang} />
      </Suspense>

      {/* Animated decorative background shared with the landing-page design. */}
      <div className="pointer-events-none fixed inset-0 z-0 animate-[hue_60s_ease-in-out_infinite]">
        <div className="absolute -top-48 left-1/4 h-[32rem] w-[32rem] rounded-full bg-violet-500/10 blur-[120px] animate-[blob_40s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -left-48 h-[30rem] w-[30rem] rounded-full bg-teal-400/10 blur-[120px] animate-[blob_52s_ease-in-out_infinite] [animation-delay:-14s]" />
        <div className="absolute -bottom-56 right-1/4 h-[34rem] w-[34rem] rounded-full bg-amber-300/10 blur-[130px] animate-[blob_60s_ease-in-out_infinite] [animation-delay:-24s]" />
      </div>

      {/* Dark overlays improve text contrast above the animated background. */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-zinc-950/60" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(9,9,11,0.65)_72%)]" />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col">
        {/* Page navigation and localized section label. */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/?lang=${lang}`}
              className="mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-zinc-100 transition hover:border-teal-300/40 hover:text-white"
            >
              {t.back}
            </Link>

            <div className="mb-5 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-200">
              {t.eyebrow}
            </div>
          </div>
        </div>

        {/* Center the insurer cards within the remaining viewport height. */}
        <div className="flex flex-1 items-center">
          <div className="grid w-full grid-cols-1 items-stretch gap-6 md:grid-cols-3">
            {insurers.map((insurer) => (
              /*
               * Selecting a card starts a new job while preserving both the
               * insurer key and the active language in the destination URL.
               */
              <Link
                key={insurer.key}
                href={`/jobs/new?insurer=${insurer.key}&lang=${lang}`}
                aria-label={`Select ${insurer.name}`}
                className="group flex h-[25rem] rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-2xl backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-teal-300/40 hover:bg-white/[0.08]"
              >
                <div className="flex h-full w-full flex-col rounded-[1.5rem] border border-white/10 bg-zinc-950/75 p-5">
                  {/* White logo panel preserves insurer brand visibility. */}
                  <div className="flex h-[8.5rem] shrink-0 items-center justify-center rounded-2xl bg-white p-5">
                    <Image
                      src={insurer.logo.src}
                      alt={`${insurer.name} logo`}
                      width={insurer.logo.w}
                      height={insurer.logo.h}
                      className="max-h-20 max-w-[250px] object-contain transition duration-300 group-hover:scale-105"
                      priority
                    />
                  </div>

                  <div className="mt-5 flex flex-1 flex-col">
                    <h2 className="text-2xl font-black tracking-tight text-zinc-50">
                      {insurer.name}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {insurer.description}
                    </p>

                    {/* Keep the selection action aligned at the card bottom. */}
                    <div className="mt-auto flex w-full items-center justify-center rounded-2xl bg-zinc-100 px-5 py-3 font-extrabold text-zinc-950 transition group-hover:bg-white">
                      {t.selectButton}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}