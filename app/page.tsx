// app/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./globals.css";

export default function LandingPage() {
  const beginRef = useRef<HTMLDivElement | null>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const el = beginRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => setShowButton(entry.isIntersecting),
      { threshold: 0.4 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scrollToBegin = () => {
    beginRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-zinc-950 font-sans">
      {/* 🔥 Blobs background */}
      <div className="pointer-events-none absolute inset-0 z-0 animate-[hue_60s_ease-in-out_infinite]">
        <div className="absolute -top-48 left-1/4 h-[32rem] w-[32rem] rounded-full bg-violet-500/10 blur-[120px] animate-[blob_40s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -left-48 h-[30rem] w-[30rem] rounded-full bg-teal-400/8 blur-[120px] animate-[blob_52s_ease-in-out_infinite] [animation-delay:-14s]" />
        <div className="absolute -bottom-56 right-1/4 h-[34rem] w-[34rem] rounded-full bg-amber-300/14 blur-[130px] animate-[blob_60s_ease-in-out_infinite] [animation-delay:-24s]" />
      </div>

      {/* Optional dark overlay for readability */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-zinc-950/45" />

      {/* HERO */}
      <section className="relative z-10 min-h-screen px-6 py-16 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-100">
          Welcome!
        </h1>
        <p className="mt-4 text-zinc-400 text-lg">Please scroll down to begin!</p>

        <button
          onClick={scrollToBegin}
          className="mt-10 rounded-full border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-900 transition"
        >
          ↓ Scroll
        </button>
      </section>

      {/* BEGIN SECTION */}
      <section
        ref={beginRef}
        className="relative z-10 min-h-screen px-6 py-16 flex items-center justify-center"
      >
        <div
          className={[
            "transition-all duration-500",
            showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          ].join(" ")}
        >
          <Link
            href="/insurers"
            className="inline-flex items-center justify-center rounded-2xl bg-zinc-100 px-10 py-5 text-lg font-extrabold text-zinc-900 shadow-sm hover:bg-white"
          >
            Begin
          </Link>
        </div>
      </section>
    </main>
  );
}
