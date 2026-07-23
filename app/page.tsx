/**
 * @file app/page.tsx
 * @description
 * Client-side landing page for SCTR Insurance Document Generator.
 *
 * This page introduces the document-generation workflow, displays
 * supported insurance providers, allows user to switch languages, and
 * directs user to the insurer-selection page to begin creating an SCTR
 * insurance document.
 *
 * Main responsibilities:
 * - Read selected language from the URL query string.
 * - Display translated landing-page content.
 * - Present the supported SCTR insurers.
 * - Explain document-generation workflow.
 * - Animate the call-to-action when user reaches the final section.
 */

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import LanguageToggle from "@/components/LanguageToggle";
import { getLang, text } from "@/lib/i18n";
import Image from "next/image";

/**
 * Insurance providers currently supported by SCTR document workflow.
 *
 * The logo paths point to static files stored in the application's `public/pdf-assets/logos` directory.
 */
const insurers = [
  {
    name: "La Positiva",
    logo: "/pdf-assets/logos/lapositiva.png",
  },
  {
    name: "Mapfre Perú",
    logo: "/pdf-assets/logos/mapfre_peru.png",
  },
  {
    name: "Rímac",
    logo: "/pdf-assets/logos/rimac.png",
  },
];

/**
 * Renders the interactive content of the landing page.
 *
 * This component is rendered inside a Suspense boundary
 * 
 * `useSearchParams` reads client-side URL state in Next.js App Router.
 * 
 */
function LandingPageContent() {
  // Read and normalize the language selected in the URL
  // Example: `?lang=es`.
  const searchParams = useSearchParams();
  const lang = getLang(searchParams.get("lang"));

  // Select translated content used throughout landing page.
  const t = text[lang].landing;
  const workflowSteps = t.workflowSteps;

  // References used for scrolling and intersection-based animation.
  const mainRef = useRef<HTMLElement | null>(null);
  const beginRef = useRef<HTMLElement | null>(null);

  // Controls whether final call-to-action card is visible and animated.
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const mainEl = mainRef.current;
    const beginEl = beginRef.current;

    // Observer requires both scroll container and target section.
    if (!mainEl || !beginEl) return;

    // Ensure landing page begins at hero section after mounting.
    mainEl.scrollTo({ top: 0, behavior: "auto" });

    // Reveal final call-to-action once enough of its section is visible
    // inside the page's custom scroll container.
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => setShowButton(entry.isIntersecting),
      {
        root: mainEl,
        threshold: 0.35,
      }
    );

    intersectionObserver.observe(beginEl);

    // Disconnect observer when component unmounts to prevent leaks.
    return () => intersectionObserver.disconnect();
  }, []);

  /** Smoothly moves user from hero section to the start section. */
  const scrollToBegin = () => {
    beginRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main
      ref={mainRef}
      className="relative isolate h-screen overflow-y-auto overflow-x-hidden overscroll-y-none scroll-smooth snap-y snap-mandatory bg-zinc-950 font-sans text-zinc-100"
    >
      {/* Switch between supported UI languages. */}
      <LanguageToggle lang={lang} />

      {/* Decorative animated color blobs displayed behind page content. */}
      <div className="pointer-events-none fixed inset-0 z-0 animate-[hue_60s_ease-in-out_infinite]">
        <div className="absolute -top-48 left-1/4 h-[32rem] w-[32rem] rounded-full bg-violet-500/10 blur-[120px] animate-[blob_40s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -left-48 h-[30rem] w-[30rem] rounded-full bg-teal-400/[0.08] blur-[120px] animate-[blob_52s_ease-in-out_infinite] [animation-delay:-14s]" />
        <div className="absolute -bottom-56 right-1/4 h-[34rem] w-[34rem] rounded-full bg-amber-300/[0.14] blur-[130px] animate-[blob_60s_ease-in-out_infinite] [animation-delay:-24s]" />
      </div>

      {/* Dark overlays improve contrast between background and foreground. */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-zinc-950/55" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(9,9,11,0.6)_72%)]" />

      {/* Hero section: Introduction and workflow summary. */}
      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl snap-start snap-always grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <div className="text-center lg:text-left">
          <div className="mx-auto mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-200 lg:mx-0">
            {t.eyebrow}
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-[-0.07em] text-zinc-50 sm:text-6xl lg:mx-0 lg:text-7xl">
            {t.titleA}
            <span className="block text-teal-200">{t.titleB}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400 lg:mx-0">
            {t.description}
          </p>

          <div className="mt-9 flex items-center justify-center lg:justify-start lg:pl-[11rem]">
            <button
              type="button"
              onClick={scrollToBegin}
              className="rounded-full border border-zinc-700 bg-zinc-900/70 px-6 py-3 font-bold text-zinc-100 transition hover:border-teal-300/40 hover:bg-zinc-900"
            >
              {t.scroll}
            </button>
          </div>
        </div>

        {/* Preview card describing instructions in document generation. */}
        <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur-2xl">
          <div className="rounded-[1.5rem] border border-white/10 bg-zinc-950/80 p-5">
            <div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                {t.howItWorks}
              </h2>
            </div>

            {/* Workflow text sourced from the active language dictionary. */}
            <div className="mt-6 space-y-3">
              {workflowSteps.map((step) => (
                <div
                  key={step.number}
                  className="grid grid-cols-[3rem_1fr] gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-200 text-sm font-black text-zinc-950">
                    {step.number}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-zinc-100">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Supported insurer logos provide a visual preview of available templates. */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {insurers.map((insurer) => (
                <div
                  key={insurer.name}
                  className="flex h-20 items-center justify-center rounded-2xl bg-white p-3"
                >
                  <Image
                    src={insurer.logo}
                    alt={`${insurer.name} logo`}
                    width={220}
                    height={48}
                    className="max-h-10 h-auto w-auto max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final section: directs user into the insurer-selection workflow. */}
      <section
        ref={beginRef}
        className="relative z-10 flex min-h-screen snap-start snap-always items-center justify-center px-6 py-16"
      >
        <div
          className={[
            "w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-2xl transition-all duration-700 sm:p-12",
            showButton ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
          ].join(" ")}
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-200 text-2xl font-black text-zinc-950">
            ✓
          </div>

          <h2 className="text-3xl font-black tracking-tight text-zinc-50 sm:text-4xl">
            {t.beginTitle}
          </h2>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-zinc-400">
            {t.beginDescription}
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href={`/insurers?lang=${lang}`}
              className="inline-flex items-center justify-center rounded-2xl bg-zinc-100 px-10 py-5 text-lg font-extrabold text-zinc-950 shadow-sm transition hover:bg-white"
            >
              {t.beginButton}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/**
 * Next.js route component for application's root page.
 *
 * Suspense boundary supports client-side search-parameter hook used
 * by `LandingPageContent` while preserving valid App Router page export.
 */
export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageContent />
    </Suspense>
  );
}