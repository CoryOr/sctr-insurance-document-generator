/**
 * Shared PDF-template helpers for the SCTR Insurance Document Generator.
 *
 * This module provides reusable HTML and CSS utilities used by insurer-specific
 * PDF templates.
 *
 * Responsibilities:
 * - Escape untrusted values before inserting them into generated HTML.
 * - Provide common A4 print styles shared across PDF templates.
 * - Render the standard footer watermark.
 * - Build employee roster tables from dynamic row and column definitions.
 */

import type { PdfRow } from "./types";

/**
 * Escapes a value for safe insertion into generated HTML.
 *
 * The function converts the input to a string and replaces characters that
 * could otherwise be interpreted as HTML markup or attributes.
 *
 * @param s - Value to escape.
 * @returns An HTML-safe string.
 */
export function esc(s: unknown) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Returns the shared CSS used by insurer-specific SCTR PDF templates.
 *
 * The styles define:
 * - A4 page dimensions and print margins.
 * - Base typography and text colors.
 * - Metadata spacing.
 * - Standard table borders and headings.
 * - A fixed footer watermark.
 * - Disclaimer formatting.
 *
 * @returns A CSS string that can be embedded in a template `<style>` element.
 */
export function baseCss() {
  return `
  @page { size: A4; margin: 14mm 14mm 16mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
  h1 { font-size: 18px; margin: 0; }
  .meta { margin-top: 10px; line-height: 1.35; }
  .meta b { display:inline-block; min-width: 120px; }
  table { width:100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #111; padding: 4px 6px; }
  th { background: #f2f2f2; font-weight: 800; font-size: 10px; text-transform: uppercase; }

  /* Small footer watermark */
  .footer-watermark{
    position: fixed;
    bottom: 8mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 8px;
    color: #777;
    letter-spacing: 2px;
  }

  /* Stronger legal clarity without huge watermark */
  .disclaimer { margin-top: 10px; font-size: 10px; color: #333; }
  `;
}

/**
 * Renders the standard footer watermark included in generated PDFs.
 *
 * @returns An HTML string containing the watermark element.
 */
export function footerWatermark() {
  return `<div class="footer-watermark">Cactus Jack</div>`;
}

/**
 * Column definition used when rendering a roster table.
 */
type RosterColumn = {
  /**
   * Property name read from each row.
   *
   * The special key `__nro` renders the one-based row number instead.
   */
  key: string;

  /**
   * Header label displayed at the top of the column.
   */
  label: string;

  /**
   * Optional CSS width applied directly to the table header.
   */
  width?: string;
};

/**
 * Builds an HTML table for an insurer's employee roster.
 *
 * Header labels and row values are escaped before insertion into the returned
 * markup. The special `__nro` column key generates sequential row numbers.
 *
 * @param rows - Parsed employee records displayed in the table body.
 * @param cols - Ordered column definitions used for headers and cell values.
 * @returns A complete HTML table string.
 */
export function rosterTable(rows: PdfRow[], cols: RosterColumn[]) {
  /*
   * Build the header row, applying optional widths supplied by each template.
   */
  const head = cols
    .map(
      (c) =>
        `<th ${c.width ? `style="width:${c.width}"` : ""}>${esc(c.label)}</th>`
    )
    .join("");

  /*
   * Render each employee record using the configured column order. All dynamic
   * row values are escaped before they are inserted into the HTML.
   */
  const body = rows
    .map((r, i) => {
      return `<tr>${cols
        .map((c) => {
          const val = c.key === "__nro" ? String(i + 1) : esc(r[c.key]);
          return `<td>${val}</td>`;
        })
        .join("")}</tr>`;
    })
    .join("");

  return `
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}