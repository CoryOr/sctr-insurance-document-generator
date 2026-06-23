// app/jobs/new/UploadTrama.tsx
"use client";

import { useMemo, useState } from "react";
import PayAndGenerateButton from "./PayAndGenerateButton";

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
};

type Vigencia = {
  inicio: string;
  fin: string;
};

function toInputDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function defaultVigencia(): Vigencia {
  const now = new Date();

  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    inicio: toInputDate(firstDay),
    fin: toInputDate(lastDay),
  };
}

function formatDateForPdf(isoDate: string) {
  if (!isoDate) return "";
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

export default function UploadTrama({ insurer }: { insurer: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [vigencia, setVigencia] = useState<Vigencia>(() => defaultVigencia());

  const companyByInsurer: Record<string, any> = {
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

  const companyBase = companyByInsurer[insurer] ?? {};

  const datesValid =
    Boolean(vigencia.inicio) &&
    Boolean(vigencia.fin) &&
    vigencia.inicio <= vigencia.fin;

  const company = {
    ...companyBase,
    vigenciaInicio: formatDateForPdf(vigencia.inicio),
    vigenciaFin: formatDateForPdf(vigencia.fin),
  };

  function insurerLabel(value?: string) {
    const v = String(value ?? "").toLowerCase();
    if (v === "rimac") return "Rimac";
    if (v === "mapfre") return "Mapfre";
    if (v === "lapositiva") return "La Positiva";
    return value ?? "";
  }  

  const canPay =
    Boolean(result?.canProceed) &&
    result?.detectedInsurer === insurer &&
    (result?.issues?.length ?? 0) === 0 &&
    Boolean(result?.parseToken);

  const canGeneratePdf = canPay && datesValid;

  async function parseNow() {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("insurer", insurer);

      const res = await fetch("/api/parse-trama", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Error parsing file");
    } finally {
      setLoading(false);
    }
  }

  async function generatePdf(opts?: { preview?: boolean; sessionId?: string }) {
    if (!result?.rows?.length) return;

    if (!datesValid) {
      setError("La fecha de inicio no puede ser posterior a la fecha de fin.");
      return;
    }

    if (!file) {
      setError("Missing original Excel file.");
      return;
    }

    const payload = {
      insurer,
      preview: Boolean(opts?.preview),
      sessionId: opts?.sessionId,
      parseToken: result?.parseToken ?? null,
      company,
      rows: result.rows,
    };

    const fd = new FormData();
    fd.append("payload", JSON.stringify(payload));
    fd.append("originalExcel", file, file.name);

    const res = await fetch("/api/generate-pdf", {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({} as any));
      throw new Error(data?.error || "PDF error");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SCTR_${insurer}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allowPreview = process.env.NEXT_PUBLIC_ALLOW_PDF_PREVIEW === "true";

  function fullName(row: ParsedRow) {
    if (row.nombrecompleto?.trim()) return row.nombrecompleto.trim();

    return [row.paterno, row.materno, row.nombres]
      .filter((v) => String(v ?? "").trim() !== "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

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

  function renderCell(row: ParsedRow, key: string, index: number) {
    if (key === "__index") return index + 1;
    if (key === "__fullname") return fullName(row);
    return (row as any)[key] ?? "";
  }

  return (
    <div className="mt-8 w-full max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-2xl backdrop-blur-2xl">
      <div className="rounded-[1.5rem] border border-white/10 bg-zinc-950/80 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-200">
              Step 1
            </div>

            <h2 className="text-2xl font-black tracking-tight text-zinc-50">
              Upload File
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Choose the worker file for {insurerLabel(insurer)} and confirm the
              PDF validity range before parsing.
            </p>
          </div>

          <div className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-sm font-bold text-teal-200">
            {insurerLabel(insurer)}
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/70 px-6 py-8 text-center transition hover:border-teal-300/50 hover:bg-zinc-950">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              onChange={(e) => {
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
              {file ? file.name : "Choose Excel file"}
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Supports .xlsx, .xls, and .csv files
            </p>
          </label>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-extrabold text-zinc-100">
                Vigencia Period
              </h3>

              <p className="text-sm leading-6 text-zinc-500">
                The date range that will appear in the generated insurance
                certificate.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-300">
                  Start date
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
                  End date
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
                La fecha de inicio no puede ser posterior a la fecha de fin.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-200">
                Step 2
              </div>

              <p className="font-bold text-zinc-100">
                {file ? "File ready to parse" : "No file selected"}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {file
                  ? "Parse the file to validate the worker data."
                  : "Upload a worker Excel file to continue."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={parseNow}
                disabled={!file || loading || !datesValid}
                className="inline-flex items-center justify-center rounded-xl bg-zinc-100 px-5 py-3 text-sm font-extrabold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "Parsing…" : "Parse file"}
              </button>

              {result?.rows?.length > 0 && (
                <>
                  {allowPreview && canGeneratePdf && (
                    <button
                      onClick={() =>
                        generatePdf({ preview: true }).catch((e: any) =>
                          setError(e?.message || "Preview PDF error")
                        )
                      }
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-teal-300/40 hover:bg-white/[0.07]"
                    >
                      Preview PDF DEV ONLY
                    </button>
                  )}

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

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              {error}
            </p>
          )}

          {result && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-sm text-zinc-500">Sheet</p>
                  <p className="mt-1 truncate font-extrabold text-zinc-100">
                    {result.sheetName}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-sm text-zinc-500">Rows</p>
                  <p className="mt-1 font-extrabold text-zinc-100">
                    {result.totalRows}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-sm text-zinc-500">Detected template</p>
                  <p className="mt-1 font-extrabold text-zinc-100">
                    {result.detectedInsurer
                      ? insurerLabel(result.detectedInsurer)
                      : "Unknown"}
                  </p>
                </div>
              </div>

              {result?.detectedInsurer && result.detectedInsurer !== insurer && (
                <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  Wrong Excel template. You selected{" "}
                  <b>{insurerLabel(insurer)}</b> but uploaded a{" "}
                  <b>{insurerLabel(result.detectedInsurer)}</b> file. Payment is
                  blocked.
                </p>
              )}

              {result.issues?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-extrabold text-zinc-100">
                    Issues found
                  </h3>

                  <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                    {result.issues.slice(0, 20).map((i: any, idx: number) => (
                      <li
                        key={idx}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300"
                      >
                        Row {i.row} {i.field ? `(${i.field})` : ""}: {i.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result?.rows?.length > 0 && (
                <div className="mt-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold text-zinc-100">
                        Data preview
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        Showing the first 50 parsed rows.
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
                        {result.rows
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