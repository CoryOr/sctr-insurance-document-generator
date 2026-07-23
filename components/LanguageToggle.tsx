/**
 * Language-switching control for the SCTR Insurance Document Generator.
 *
 * This client component displays the currently active language and lets the
 * user switch between Spanish and English without leaving the current route.
 *
 * Responsibilities:
 * - Read the current pathname and query parameters.
 * - Determine the alternate supported language.
 * - Preserve existing query parameters while updating `lang`.
 * - Navigate to the localized version of the current page.
 * - Provide localized accessibility labels and tooltips.
 */

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/i18n";

/**
 * Props accepted by the language toggle.
 */
type LanguageToggleProps = {
  /**
   * Currently active application language.
   */
  lang: Lang;
};

/**
 * Switches the application between Spanish and English.
 *
 * @param lang - Currently active language.
 * @returns A fixed-position button showing the active locale.
 */
export default function LanguageToggle({ lang }: LanguageToggleProps) {
  /*
   * App Router hooks provide the current route and allow client-side navigation
   * after the language query parameter has been updated.
   */
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /*
   * The application currently supports two languages, so the next language is
   * always the opposite of the active one.
   */
  const nextLang: Lang = lang === "es" ? "en" : "es";

  /**
   * Preserves the current query string while replacing the language parameter.
   */
  function switchLanguage() {
    /*
     * Create a mutable copy because the search-parameter object returned by
     * Next.js is read-only.
     */
    const params = new URLSearchParams(searchParams.toString());

    params.set("lang", nextLang);

    /*
     * Navigate to the same route with the updated language and all unrelated
     * query parameters preserved.
     */
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
      {/* Display the flag and abbreviation for the currently active language. */}
      <span className="text-lg">{lang === "es" ? "🇵🇪" : "🇺🇸"}</span>
      <span>{lang === "es" ? "ES" : "EN"}</span>
    </button>
  );
}