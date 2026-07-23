/**
 * Insurer PDF-template registry for the SCTR Insurance Document Generator.
 *
 * This module centralizes insurer-name normalization and routes each document
 * request to the correct insurer-specific HTML renderer.
 *
 * Responsibilities:
 * - Define the supported internal insurer keys.
 * - Normalize user- or route-supplied insurer names.
 * - Support known insurer aliases, including Protecta/Grandia.
 * - Dispatch validated document data to the matching PDF template.
 * - Provide a fallback renderer when no supported insurer is recognized.
 */

import { renderLaPositiva } from "./lapositiva";
import { renderRimac } from "./rimac";
import { renderPacifico } from "./pacifico";
import { renderMapfre } from "./mapfre";
import { renderProtecta } from "./protecta";
import type { PdfTemplateData } from "./types";

/**
 * Canonical insurer identifiers supported by the template registry.
 *
 * The `generic` value represents insurer names that do not match a known
 * template.
 */
export type InsurerKey =
  | "lapositiva"
  | "rimac"
  | "pacifico"
  | "mapfre"
  | "protecta"
  | "generic";

/**
 * Converts an arbitrary insurer name into a canonical template key.
 *
 * Matching is case-insensitive and uses substring checks so values such as
 * `"La Positiva Vida"` or `"MAPFRE Perú"` resolve to their internal keys.
 * Protecta and Grandia are treated as aliases for the same template.
 *
 * @param insurer - Raw insurer name or key supplied by the workflow.
 * @returns The normalized insurer key used for template selection.
 */
export function normalizeInsurerKey(insurer: string): InsurerKey {
  /*
   * Normalize empty and mixed-case values before checking insurer aliases.
   */
  const v = (insurer || "").toLowerCase();

  if (v.includes("positiva")) return "lapositiva";
  if (v.includes("rimac")) return "rimac";
  if (v.includes("pacifico")) return "pacifico";
  if (v.includes("mapfre")) return "mapfre";

  /*
   * Grandia documents use the same renderer as Protecta.
   */
  if (v.includes("protecta") || v.includes("grandia")) return "protecta";

  return "generic";
}

/**
 * Renders the insurer-specific HTML document used for PDF generation.
 *
 * @param insurer - Raw insurer name or internal insurer key.
 * @param data - Company, worker-row, and embedded-asset data expected by the
 * insurer template.
 * @returns The complete HTML string produced by the selected renderer.
 */
export function renderTemplate(insurer: string, data: PdfTemplateData) {
  const key = normalizeInsurerKey(insurer);

  /*
   * Route the normalized insurer key to its corresponding document template.
   */
  switch (key) {
    case "lapositiva":
      return renderLaPositiva(data);

    case "rimac":
      return renderRimac(data);

    case "pacifico":
      return renderPacifico(data);

    case "mapfre":
      return renderMapfre(data);

    case "protecta":
      return renderProtecta(data);

    /*
     * Unknown insurer names currently fall back to the La Positiva renderer.
     * Replace this branch with a dedicated generic template if one is added.
     */
    default:
      return renderLaPositiva(data);
  }
}