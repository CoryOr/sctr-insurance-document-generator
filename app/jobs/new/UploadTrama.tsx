// app/jobs/new/UploadTrama.tsx
/**
 * Excel upload, validation, payment, and PDF-generation workflow for a new
 * SCTR insurance document.
 *
 * This client component coordinates the main user-facing workflow after an
 * insurer has been selected:
 * - Accept an insurer-specific Excel workbook.
 * - Collect and validate the policy coverage period (`vigencia`).
 * - Send the workbook to the parsing API for template and row validation.
 * - Display detected template information, issues, and a data preview.
 * - Allow local PDF previews when the public preview flag is enabled.
 * - Start Stripe Checkout and generate the final paid PDF.
 * - Include the original workbook when requesting PDF generation so it can be
 *   delivered to the selected insurer.
 */

"use client";

import { useMemo, useState } from "react";
import PayAndGenerateButton from "./PayAndGenerateButton";
import { text, type Lang } from "@/lib/i18n";
import { getErrorMessage } from "@/lib/getErrorMessage";

/**
 * Normalized employee row returned by the Excel parsing endpoint.
 *
 * Fields are optional because each insurer template exposes a different set of
 * columns and incomplete rows may still be returned with validation issues.
 */
type ParsedRow = {
  __row?: string;
  nombres?: string;
  paterno?: string;
  materno?: string;
  nombrecompleto?: string;
  tipodoc?: string;
  nrodoc?: string;
  fechanac?: string;
  moneda?: string;
  remuneracion?: string;
  tipotrab?: string;
  sede?: string;
  [key: string]: string | undefined;
};

/**
 * Policy coverage period stored in the ISO format expected by HTML date inputs.
 */
type Vigencia = {
  inicio: string;
  fin: string;
};

type ParseIssue = {
  row: number;
  field?: string;
  message: string;
};

type ParseResult = {
  insurer?: string;
  detectedInsurer?: string | null;
  canProceed?: boolean;
  parseToken?: string | null;
  sheetName?: string;
  totalRows?: number;
  rows?: ParsedRow[];
  issues?: ParseIssue[];
};

type CompanyData = Record<string, string>;

type ErrorResponse = {
  error?: string;
};

/**
 * Converts a local `Date` value into the `yyyy-mm-dd` format used by date
 * inputs without allowing the UTC conversion to shift the calendar day.
 *
 * @param date - Local date to format.
 * @returns The date formatted for an HTML date input.
 */
function toInputDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Creates the default coverage period using the first and last days of the
 * current local month.
 *
 * @returns The initial policy coverage period for the form.
 */
function defaultVigencia(): Vigencia {
  const now = new Date();

  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    inicio: toInputDate(firstDay),
    fin: toInputDate(lastDay),
  };
}

/**
 * Converts an HTML date-input value into the `dd/mm/yyyy` format expected by
 * the insurer PDF templates.
 *
 * @param isoDate - Date in `yyyy-mm-dd` format.
 * @returns The formatted date, or an empty string when no date is supplied.
 */
function formatDateForPdf(isoDate: string) {
  if (!isoDate) return "";
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Runs the insurer-specific Excel upload and SCTR document-generation flow.
 *
 * @param insurer - Selected insurer key used for validation and PDF rendering.
 * @param lang - Active language used for interface translations.
 * @returns The upload form, validation results, data preview, and payment tools.
 */
export default function UploadTrama({
  insurer,
  lang = "es",
}: {
  insurer: string;
  lang?: Lang;
}) {
  // Load the translated labels used throughout the upload workflow.
  const t = text[lang].upload;
  // Store the original workbook so it can be parsed and later delivered.
  const [file, setFile] = useState<File | null>(null);
  // Track active workbook-parsing requests.
  const [loading, setLoading] = useState(false);
  // Hold the normalized rows, validation issues, and signed parse token.
  const [result, setResult] = useState<ParseResult | null>(null);
  // Display parsing, validation, checkout, preview, or PDF-generation errors.
  const [error, setError] = useState<string | null>(null);
  // Initialize the coverage period to the current calendar month.
  const [vigencia, setVigencia] = useState<Vigencia>(() => defaultVigencia());

  /*
   * Normalize optional API collections to arrays so rendering and generation
   * code can safely access `.length`, `.slice`, and `.map`.
   */
  const parsedRows = result?.rows ?? [];
  const parseIssues = result?.issues ?? [];

  /**
   * Insurer-specific certificate metadata passed to the PDF templates.
   *
   * The user-selected coverage dates below override the static coverage values
   * in these base records before generation.
   */
  const companyByInsurer: Record<string, CompanyData> = {
    lapositiva: {
      empresa: "CONSORCIO ROVELLA-INMAC",
      emisionLugar: "Miraflores",
      emisionFecha: "22 de diciembre del 2025",
      vigenciaInicio: "01/12/2025",
      vigenciaFin: "01/01/2026",
      actividad: "",
      polizaPension: "62032782",
      contratoSalud: "2901613",
      sede: "ZAÑA",
      firma1Nombre: "Rodrigo Gonzales Muñoz",
      firma1Cargo: "Gerente de División Técnica.",
      firma1Org: "La Positiva Vida Seguros y Reaseguros",
      firma2Nombre: "Ann Jennyfer Natalia Masgo Ramirez",
      firma2Cargo: "Subgerente Técnico",
      firma2Org: "La Positiva EPS",
    },

    rimac: {
      codigo: "SCTR8072498-S0257067-SALUD",
      emisionLugar: "Miraflores",
      emisionFechaLarga: "07 de Enero del 2026",
      emisionHora: "02:33 PM",
      empresa: "CORPORACION PANASERVICE SAC",
      polizaSalud: "S0257067",
      vigenciaInicio: "01/01/2026",
      vigenciaFin: "31/01/2026",
      sede: "SEDE SUPERFICIE",
      usuario: "XT10212",
      firmanteNombre: "Roberto Carlos León Gavonel",
      firmanteOrg: "Rimac EPS S.A. Entidad Prestadora\nde Salud",
    },

    mapfre: {
      constanciaNro: "MP/2025/12509339",
      empresa: "BADELI SOCIEDAD ANONIMA CERRADA",
      polizaPension: "7012500094562",
      contratoSalud: "7022500119628",
      vigenciaInicio: "01/11/2025",
      vigenciaFin: "30/11/2025",
      emitidoTexto: "Se expide la presente, para fines que consideren conveniente.",
      emisionFechaHora: "29/10/2025 06:08:03 pm",
      emitidoPor: "Echegaray Reyes, Enmanuel",
      firmanteNombre: "ISAAC RAMIREZ MOLINA",
      firmanteCargo: "UNIDAD DE RIESGOS DEL TRABAJO",
    },
  };

  // Use an empty object for unsupported insurer keys to keep rendering safe.
  const companyBase = companyByInsurer[insurer] ?? {};

  /*
   * Both coverage dates are required, and the start date cannot occur after the
   * end date. ISO date strings can be compared lexicographically.
   */
  const datesValid =
    Boolean(vigencia.inicio) &&
    Boolean(vigencia.fin) &&
    vigencia.inicio <= vigencia.fin;

  /*
   * Merge the selected insurer's certificate data with the coverage dates
   * currently entered by the user.
   */
  const company = {
    ...companyBase,
    vigenciaInicio: formatDateForPdf(vigencia.inicio),
    vigenciaFin: formatDateForPdf(vigencia.fin),
  };

  /**
   * Converts an insurer route key into a user-facing label.
   *
   * @param value - Insurer key to display.
   * @returns A formatted insurer name.
   */
  function insurerLabel(value?: string) {
    const v = String(value ?? "").toLowerCase();
    if (v === "rimac") return "Rimac";
    if (v === "mapfre") return "Mapfre";
    if (v === "lapositiva") return "La Positiva";
    return value ?? "";
  }  

  /*
   * Payment is available only when parsing succeeded, the workbook template
   * matches the selected insurer, no issues remain, and the server returned a
   * signed parse-guard token.
   */
  const canPay =
    Boolean(result?.canProceed) &&
    result?.detectedInsurer === insurer &&
    parseIssues.length === 0 &&
    Boolean(result?.parseToken);

  // Final generation additionally requires a valid policy coverage period.
  const canGeneratePdf = canPay && datesValid;

  /**
   * Uploads the selected workbook for server-side parsing and validation.
   */
  async function parseNow() {
    if (!file) return;

    // Clear stale results while the newly selected workbook is processed.
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Send the original file and selected insurer as multipart form data.
      const fd = new FormData();
      fd.append("file", file);
      fd.append("insurer", insurer);

      const res = await fetch("/api/parse-trama", { method: "POST", body: fd });
      const data = (await res.json()) as ParseResult & ErrorResponse;

      // Surface the API-provided validation or parsing error when available.
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Error parsing file"));
    } finally {
      setLoading(false);
    }
  }

  /**
   * Requests a preview or paid PDF and starts a browser download.
   *
   * @param opts.preview - Marks a development-only preview request.
   * @param opts.sessionId - Paid Stripe Checkout session for final generation.
   */
  async function generatePdf(opts?: { preview?: boolean; sessionId?: string }) {
    // PDF templates require at least one parsed employee row.
    if (parsedRows.length === 0) return;

    if (!datesValid) {
      setError(t.invalidDates);
      return;
    }

    if (!file) {
      setError("Missing original Excel file.");
      return;
    }

    /*
     * Send the validated rows, signed parse token, insurer metadata, coverage
     * period, and optional Stripe session to the PDF route.
     */
    const payload = {
      insurer,
      preview: Boolean(opts?.preview),
      sessionId: opts?.sessionId,
      parseToken: result?.parseToken ?? null,
      company,
      rows: parsedRows,
    };

    /*
     * Include the original workbook with the JSON payload so paid requests can
     * deliver the source file to the selected insurer after rendering.
     */
    const fd = new FormData();
    fd.append("payload", JSON.stringify(payload));
    fd.append("originalExcel", file, file.name);

    const res = await fetch("/api/generate-pdf", {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(data?.error || "PDF error");
    }

    // Convert the PDF response into a temporary browser download URL.
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SCTR_${insurer}.pdf`;
    a.click();

    // Release the temporary object URL after initiating the download.
    URL.revokeObjectURL(url);
  }

  /*
   * Preview generation is exposed only when explicitly enabled through a
   * public build-time environment variable.
   */
  const allowPreview = process.env.NEXT_PUBLIC_ALLOW_PDF_PREVIEW === "true";

  /**
   * Builds a display name from either the full-name field or split name fields.
   *
   * @param row - Parsed employee row.
   * @returns A normalized employee name for the preview table.
   */
  function fullName(row: ParsedRow) {
    if (row.nombrecompleto?.trim()) return row.nombrecompleto.trim();

    return [row.paterno, row.materno, row.nombres]
      .filter((v) => String(v ?? "").trim() !== "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /*
   * Select the preview-table columns required by the active insurer. Memoizing
   * the configuration avoids rebuilding it on unrelated state updates.
   */
  const previewColumns = useMemo(() => {
    if (insurer === "mapfre") {
      return [
        { key: "__index", label: "#" },
        { key: "tipodoc", label: "TipoDoc" },
        { key: "nrodoc", label: "NumDoc" },
        { key: "__fullname", label: "Nombre completo" },
        { key: "fechanac", label: "Nacimiento" },
        { key: "remuneracion", label: "Sueldo" },
      ];
    }

    if (insurer === "rimac") {
      return [
        { key: "__index", label: "#" },
        { key: "__fullname", label: "Apellidos y nombres" },
        { key: "tipodoc", label: "TipoDoc" },
        { key: "nrodoc", label: "NroDoc" },
        { key: "sede", label: "Sede" },
      ];
    }

    // default / La Positiva
    return [
      { key: "__index", label: "#" },
      { key: "nombres", label: "Nombres" },
      { key: "paterno", label: "Paterno" },
      { key: "materno", label: "Materno" },
      { key: "tipodoc", label: "TipoDoc" },
      { key: "nrodoc", label: "NroDoc" },
      { key: "fechanac", label: "FechaNac" },
      { key: "moneda", label: "Moneda" },
      { key: "remuneracion", label: "Remuneración" },
      { key: "tipotrab", label: "TipoTrab" },
      { key: "sede", label: "Sede" },
    ];
  }, [insurer]);

  /**
   * Resolves computed and direct values for one preview-table cell.
   *
   * @param row - Parsed employee row.
   * @param key - Column key or supported computed-field identifier.
   * @param index - Zero-based row position in the preview.
   * @returns The value displayed in the table cell.
   */
  function renderCell(row: ParsedRow, key: string, index: number) {
    if (key === "__index") return index + 1;
    if (key === "__fullname") return fullName(row);
    return row[key] ?? "";
  }

  return (
    /* Outer glass panel containing the complete upload workflow. */
    <div className="mt-8 w-full max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-2xl backdrop-blur-2xl">
      <div className="rounded-[1.5rem] border border-white/10 bg-zinc-950/80 p-6">
        {/* Step heading and currently selected insurer. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-200">
              {t.step1}
            </div>

            <h2 className="text-2xl font-black tracking-tight text-zinc-50">
              {t.uploadTitle}
            </h2>
          </div>

          <div className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-sm font-bold text-teal-200">
            {insurerLabel(insurer)}
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          {/* Accessible drop-zone-style control for selecting the workbook. */}
          <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/70 px-6 py-8 text-center transition hover:border-teal-300/50 hover:bg-zinc-950">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              onChange={(e) => {
                // Selecting a new file invalidates all previous parse results.
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setResult(null);
                setError(null);
              }}
            />

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-2xl font-black text-zinc-950 transition group-hover:bg-white">
              ↑
            </div>

            <p className="mt-4 text-base font-extrabold text-zinc-100">
              {file ? file.name : t.chooseFile}
            </p>

            <p className="mt-1 text-sm text-zinc-500">{t.supports}</p>
          </label>

          {/* Policy coverage-period inputs used by every PDF template. */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-extrabold text-zinc-100">
                {t.vigenciaTitle}
              </h3>

              <p className="text-sm leading-6 text-zinc-500">
                {t.vigenciaDescription}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-300">
                  {t.startDate}
                </span>

                <input
                  type="date"
                  value={vigencia.inicio}
                  onChange={(e) =>
                    setVigencia((prev) => ({
                      ...prev,
                      inicio: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-300/50"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-300">
                  {t.endDate}
                </span>

                <input
                  type="date"
                  value={vigencia.fin}
                  onChange={(e) =>
                    setVigencia((prev) => ({
                      ...prev,
                      fin: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-300/50"
                />
              </label>
            </div>

            {!datesValid && (
              <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                {t.invalidDates}
              </p>
            )}
          </div>

          {/* Parse, preview, payment, and generation actions. */}
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-200">
                {t.step2}
              </div>

              <p className="font-bold text-zinc-100">
                {file ? t.fileReady : t.noFile}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {file ? t.fileReadyDescription : t.noFileDescription}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={parseNow}
                disabled={!file || loading || !datesValid}
                className="inline-flex items-center justify-center rounded-xl bg-zinc-100 px-5 py-3 text-sm font-extrabold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? t.parsing : t.parseFile}
              </button>

              {/* Generation controls appear only after rows are parsed. */}
              {parsedRows.length > 0 && (
                <>
                  {/* Development-only preview bypasses the payment popup. */}
                  {allowPreview && canGeneratePdf && (
                    <button
                      onClick={() =>
                        generatePdf({ preview: true }).catch((error: unknown) =>
                          setError(getErrorMessage(error, "Preview PDF error"))
                        )
                      }
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-teal-300/40 hover:bg-white/[0.07]"
                    >
                      {t.previewPdf}
                    </button>
                  )}

                  {/* Paid generation is delegated to the Stripe workflow. */}
                  <PayAndGenerateButton
                    insurer={insurer}
                    parseToken={result?.parseToken ?? null}
                    disabled={!canGeneratePdf}
                    onGeneratePdf={(sessionId) => generatePdf({ sessionId })}
                  />
                </>
              )}
            </div>
          </div>

          {/* Display the most recent user-actionable workflow error. */}
          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              {error}
            </p>
          )}

          {/* Workbook summary, validation issues, and row preview. */}
          {result && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-sm text-zinc-500">{t.sheet}</p>
                  <p className="mt-1 truncate font-extrabold text-zinc-100">
                    {result.sheetName}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-sm text-zinc-500">{t.rows}</p>
                  <p className="mt-1 font-extrabold text-zinc-100">
                    {result.totalRows}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-sm text-zinc-500">
                    {t.detectedTemplate}
                  </p>
                  <p className="mt-1 font-extrabold text-zinc-100">
                    {result.detectedInsurer
                      ? insurerLabel(result.detectedInsurer)
                      : "Unknown"}
                  </p>
                </div>
              </div>

              {/* Warn when the uploaded workbook belongs to another insurer. */}
              {result?.detectedInsurer && result.detectedInsurer !== insurer && (
                <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {t.wrongTemplateA} <b>{insurerLabel(insurer)}</b>{" "}
                  {t.wrongTemplateB}{" "}
                  <b>{insurerLabel(result.detectedInsurer)}</b>{" "}
                  {t.wrongTemplateC}
                </p>
              )}

              {/* Show up to the first 20 validation issues from the parser. */}
              {parseIssues.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-extrabold text-zinc-100">
                    {t.issuesFound}
                  </h3>

                  <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                    {parseIssues.slice(0, 20).map((issue, idx) => (
                      <li
                        key={idx}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300"
                      >
                        Row {issue.row} {issue.field ? `(${issue.field})` : ""}:{" "}
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview up to 50 normalized employee rows. */}
              {parsedRows.length > 0 && (
                <div className="mt-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold text-zinc-100">
                        {t.dataPreview}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        {t.dataPreviewDescription}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-zinc-950">
                    <table className="w-full min-w-[900px] border-collapse text-sm">
                      <thead className="sticky top-0 bg-zinc-950">
                        <tr className="border-b border-zinc-800 text-zinc-300">
                          {previewColumns.map((col) => (
                            <th
                              key={col.key}
                              className="px-4 py-3 text-left font-bold"
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {parsedRows
                          .slice(0, 50)
                          .map((row: ParsedRow, idx: number) => (
                            <tr
                              key={idx}
                              className="border-b border-zinc-900 text-zinc-300 transition hover:bg-white/[0.03]"
                            >
                              {previewColumns.map((col) => (
                                <td
                                  key={col.key}
                                  className="px-4 py-3 align-top"
                                >
                                  {renderCell(row, col.key, idx)}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}