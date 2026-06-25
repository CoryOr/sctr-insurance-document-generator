"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/i18n";

export default function LanguageToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const nextLang: Lang = lang === "es" ? "en" : "es";

  function switchLanguage() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", nextLang);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      aria-label={
        lang === "es"
          ? "Idioma actual: Español. Cambiar a inglés."
          : "Current language: English. Switch to Spanish."
      }
      title={
        lang === "es"
          ? "Español — cambiar a inglés"
          : "English — switch to Spanish"
      }
      className="fixed right-6 top-6 z-50 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black uppercase text-zinc-100 shadow-2xl backdrop-blur-2xl transition hover:border-teal-300/40 hover:bg-white/[0.09]"
    >
      <span className="text-lg">{lang === "es" ? "🇵🇪" : "🇺🇸"}</span>
      <span>{lang === "es" ? "ES" : "EN"}</span>
    </button>
  );
}