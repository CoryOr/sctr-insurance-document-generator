// app/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const workflowSteps = [
  {
    number: "01",
    title: "Upload TRAMA / Excel File",
    description: "Import worker data for SCTR document generation.",
  },
  {
    number: "02",
    title: "Validate Insurer Data",
    description: "The system checks required fields before document creation.",
  },
  {
    number: "03",
    title: "Generate Insurance PDFs",
    description: "Generate clean insurance PDFs ready for review or delivery.",
  },
];

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

export default function LandingPage() {
  const mainRef = useRef<HTMLElement | null>(null);
  const beginRef = useRef<HTMLElement | null>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const mainEl = mainRef.current;
    const beginEl = beginRef.current;

    if (!mainEl || !beginEl) return;

    mainEl.scrollTo({ top: 0, behavior: "auto" });

    const io = new IntersectionObserver(
      ([entry]) => setShowButton(entry.isIntersecting),
      {
        root: mainEl,
        threshold: 0.35,
      }
    );

    io.observe(beginEl);

    return () => io.disconnect();
  }, []);

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
      {/* Animated background */}
      <div className="pointer-events-none fixed inset-0 z-0 animate-[hue_60s_ease-in-out_infinite]">
        <div className="absolute -top-48 left-1/4 h-[32rem] w-[32rem] rounded-full bg-violet-500/10 blur-[120px] animate-[blob_40s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -left-48 h-[30rem] w-[30rem] rounded-full bg-teal-400/[0.08] blur-[120px] animate-[blob_52s_ease-in-out_infinite] [animation-delay:-14s]" />
        <div className="absolute -bottom-56 right-1/4 h-[34rem] w-[34rem] rounded-full bg-amber-300/[0.14] blur-[130px] animate-[blob_60s_ease-in-out_infinite] [animation-delay:-24s]" />
      </div>

      <div className="pointer-events-none fixed inset-0 z-0 bg-zinc-950/55" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(9,9,11,0.6)_72%)]" />

      {/* HERO */}
      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl snap-start snap-always grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <div className="text-center lg:text-left">
          <div className="mx-auto mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-200 lg:mx-0">
            Internal Insurance Automation
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-[-0.07em] text-zinc-50 sm:text-6xl lg:mx-0 lg:text-7xl">
            SCTR Insurance
            <span className="block text-teal-200">Document Generator</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400 lg:mx-0">
            Upload workers' excel files, validate construction insurance data, and
            generate branded SCTR PDF documents for supported insurers.
          </p>

          <div className="mt-9 flex items-center justify-center lg:justify-start lg:pl-45">
            <button
              onClick={scrollToBegin}
              className="rounded-full border border-zinc-700 bg-zinc-900/70 px-6 py-3 font-bold text-zinc-100 transition hover:border-teal-300/40 hover:bg-zinc-900"
            >
              ↓ SCROLL TO BEGIN
            </button>
          </div>
        </div>

        {/* Product preview card */}
        <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur-2xl">
          <div className="rounded-[1.5rem] border border-white/10 bg-zinc-950/80 p-5">
            <div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                How it Works?
              </h2>
            </div>

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

            <div className="mt-5 grid grid-cols-3 gap-3">
              {insurers.map((insurer) => (
                <div
                  key={insurer.name}
                  className="flex h-20 items-center justify-center rounded-2xl bg-white p-3"
                >
                  <img
                    src={insurer.logo}
                    alt={`${insurer.name} logo`}
                    className="max-h-10 max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BEGIN SECTION */}
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
            Start a new SCTR generation
          </h2>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-zinc-400">
            Continue to the upload workflow, select insurer details, process the
            worker file, and generate the final branded documents.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/insurers"
              className="inline-flex items-center justify-center rounded-2xl bg-zinc-100 px-10 py-5 text-lg font-extrabold text-zinc-950 shadow-sm transition hover:bg-white"
            >
              Begin Generation
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}