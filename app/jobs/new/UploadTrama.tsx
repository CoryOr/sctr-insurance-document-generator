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

    const payload = {
      insurer,
      preview: Boolean(opts?.preview),
      sessionId: opts?.sessionId,
      parseToken: result?.parseToken ?? null,
      company,
      rows: result.rows,
    };

    const res = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    <div className="mt-6 max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <p className="text-xl font-semibold text-zinc-100">
        Upload worker Excel
      </p>

      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="mt-4 block w-full cursor-pointer rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900 hover:border-zinc-700"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          setResult(null);
          setError(null);
        }}
      />

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h3 className="text-base font-semibold text-zinc-100">
          Vigencia del PDF
        </h3>

        <p className="mt-1 text-sm text-zinc-400">
          Selecciona el rango de vigencia que aparecerá en la constancia.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-300">
              Vigencia inicio
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
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-300">
              Vigencia fin
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
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
        </div>

        {!datesValid && (
          <p className="mt-3 text-sm text-red-400">
            La fecha de inicio no puede ser posterior a la fecha de fin.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={parseNow}
          disabled={!file || loading || !datesValid}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800"
              >
                Preview PDF (dev)
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

        {file && <span className="text-sm text-zinc-400">{file.name}</span>}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mt-6">
          <p className="text-sm text-zinc-300">
            Sheet:{" "}
            <span className="font-semibold text-zinc-100">{result.sheetName}</span>
            {" — "}Rows:{" "}
            <span className="font-semibold text-zinc-100">{result.totalRows}</span>
          </p>

          {result?.detectedInsurer && (
            <p className="mt-3 text-sm text-zinc-300">
              Detected template:{" "}
              <span className="font-semibold text-zinc-100">
                {result.detectedInsurer}
              </span>
            </p>
          )}

          {result?.detectedInsurer && result.detectedInsurer !== insurer && (
            <p className="mt-3 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              Wrong Excel template. You selected <b>{insurerLabel(insurer)}</b> but uploaded a{" "}
              <b>{insurerLabel(result.detectedInsurer)}</b> file. Payment is blocked.
            </p>
          )}

          {result.issues?.length > 0 && (
            <>
              <h3 className="mt-6 text-lg font-semibold text-zinc-100">
                Issues (first 20)
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-300">
                {result.issues.slice(0, 20).map((i: any, idx: number) => (
                  <li key={idx}>
                    Row {i.row} {i.field ? `(${i.field})` : ""}: {i.message}
                  </li>
                ))}
              </ul>
            </>
          )}

          {result?.rows?.length > 0 && (
            <>
              <h3 className="mt-6 text-lg font-semibold text-zinc-100">
                Preview (first 50)
              </h3>

              <div className="mt-3 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950">
                <table className="min-w-[900px] w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-zinc-950">
                    <tr className="border-b border-zinc-800 text-zinc-300">
                      {previewColumns.map((col) => (
                        <th key={col.key} className="px-3 py-3 text-left font-semibold">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {result.rows.slice(0, 50).map((row: ParsedRow, idx: number) => (
                      <tr key={idx} className="border-b border-zinc-900 text-zinc-200">
                        {previewColumns.map((col) => (
                          <td key={col.key} className="px-3 py-3 align-top">
                            {renderCell(row, col.key, idx)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}