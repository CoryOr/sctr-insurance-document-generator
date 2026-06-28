// app/jobs/new/page.tsx
import Link from "next/link";
import { Suspense } from "react";
import UploadTrama from "./UploadTrama";
import LanguageToggle from "@/components/LanguageToggle";
import { getLang, text } from "@/lib/i18n";

type SP = Record<string, string | string[] | undefined>;

function insurerLabel(value: string) {
  if (value === "rimac") return "Rimac";
  if (value === "mapfre") return "Mapfre";
  if (value === "lapositiva") return "La Positiva";
  return value;
}

export default async function NewJobPage({
  searchParams,
}: {
  searchParams?: SP | Promise<SP>;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const lang = getLang(sp.lang);
  const t = text[lang].jobs;

  const insurerParam = sp.insurer;
  const insurer = Array.isArray(insurerParam)
    ? insurerParam[0]
    : insurerParam ?? "unknown";

  return (
    <main className="relative isolate h-dvh overflow-y-auto overflow-x-hidden bg-zinc-950 px-4 py-6 font-sans text-zinc-100 sm:px-6 lg:px-8">
      <Suspense fallback={null}>
        <LanguageToggle lang={lang} />
      </Suspense>

      <section className="mx-auto w-full max-w-7xl pb-16">
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

        <UploadTrama insurer={insurer} lang={lang} />
      </section>
    </main>
  );
}