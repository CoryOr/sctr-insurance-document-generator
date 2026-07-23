/**
 * Shared HTML helpers for insurer-specific SCTR PDF templates.
 *
 * This module provides lightweight utilities used by templates that need:
 * - Safe HTML escaping for dynamic values.
 * - Shared box-sizing and watermark styles.
 * - A reusable fixed footer watermark.
 *
 * The returned HTML and CSS strings are embedded directly into the generated
 * insurer documents before Chromium renders them as PDFs.
 */

/**
 * Escapes a value for safe insertion into generated HTML.
 *
 * The function converts nullish values to an empty string and replaces the
 * characters that could otherwise be interpreted as HTML markup or attributes.
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
 * Returns the shared CSS used by templates that import this helper module.
 *
 * The styles:
 * - Apply `border-box` sizing to all elements.
 * - Position the watermark at the bottom of every printed page.
 * - Use subtle typography so the watermark does not overpower the document.
 *
 * Unlike `baseCss` in `base.ts`, this function returns a complete `<style>`
 * element rather than only the CSS rules.
 *
 * @returns A `<style>` element containing shared PDF-template CSS.
 */
export function baseCss() {
  return `<style>
    * { box-sizing: border-box; }

    .mgd-watermark {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 6mm;
      text-align: center;
      font-size: 9px;
      color: rgba(0,0,0,0.35);
      letter-spacing: 0.5px;
    }
  </style>`;
}

/**
 * Renders the fixed footer watermark used by the generated PDF.
 *
 * The watermark text is escaped before insertion so custom values cannot inject
 * HTML into the document.
 *
 * @param text - Watermark label displayed at the bottom of the page.
 * @returns An HTML string containing the watermark element.
 */
export function footerWatermark(text = "Cactus Jack") {
  return `<div class="mgd-watermark">${esc(text)}</div>`;
}