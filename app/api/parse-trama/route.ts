// app/api/parse-trama/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { z } from "zod";
import { signParseGuard } from "@/lib/parse-guard";

export const runtime = "nodejs";

type Issue = {
  row: number;
  field?: string;
  message: string;
};

type ParsedRow = {
  __row: string;
  nombres?: string;
  primernombre?: string;
  segundonombre?: string;
  paterno?: string;
  materno?: string;
  nombrecompleto?: string;
  tipodoc?: string;
  nrodoc?: string;
  fechanac?: string;
  sexo?: string;
  producto?: string;
  moneda?: string;
  remuneracion?: string;
  tipotrab?: string;
  sede?: string;
  estadocivil?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
};

function normalizeHeader(h: unknown) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

function safeString(v: unknown) {
  return String(v ?? "").trim();
}

function formatFechaNac(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return "";

  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4)}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    return s;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    return s.replace(/-/g, "/");
  }

  return s;
}

function normalizeRemuneracion(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return "";

  const compact = s.replace(/\s+/g, "");

  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(compact)) {
    return compact.replace(/,/g, "");
  }

  if (/^\d+(\.\d+)?$/.test(compact)) {
    return compact;
  }

  if (/^\d+(,\d+)?$/.test(compact) && compact.includes(",")) {
    return compact.replace(",", ".");
  }

  return compact;
}

function normalizeRimacTipoDoc(v: unknown) {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return "";

  if (s === "1" || s === "DNI") return "DNI";
  if (s === "2" || s === "CE") return "CE";
  if (s === "6" || s === "PAS" || s === "PASAPORTE") return "PAS";

  return s;
}

function onlyLettersSpaces(v: string) {
  return /^[A-ZÁÉÍÓÚÑ ]+$/i.test(v.trim());
}

const ALLOWED_KEYS = new Set([
  "nombres",
  "primernombre",
  "segundonombre",
  "paterno",
  "materno",
  "nombrecompleto",
  "tipodoc",
  "nrodoc",
  "fechanac",
  "sexo",
  "producto",
  "moneda",
  "remuneracion",
  "tipotrab",
  "sede",
  "estadocivil",
  "direccion",
  "telefono",
  "correo",
]);

const CANON_MAP: Record<string, string> = {
  nombres: "nombres",
  nombre: "nombres",
  names: "nombres",
  primernombre: "primernombre",
  segundonombre: "segundonombre",

  paterno: "paterno",
  apellidopaterno: "paterno",
  apellido_paterno: "paterno",
  apepaterno: "paterno",

  materno: "materno",
  apellidomaterno: "materno",
  apellido_materno: "materno",
  apematerno: "materno",

  nombrecompleto: "nombrecompleto",
  nombrescompletos: "nombrecompleto",

  tipodoc: "tipodoc",
  tipdoc: "tipodoc",
  tipodedocumento: "tipodoc",
  tipodocumento: "tipodoc",

  nrodoc: "nrodoc",
  nrodocumento: "nrodoc",
  numerodocumento: "nrodoc",
  numerodoc: "nrodoc",
  nrdoc: "nrodoc",
  documento: "nrodoc",
  dni: "nrodoc",
  numdoc: "nrodoc",

  fechanac: "fechanac",
  fechadenac: "fechanac",
  fechanacimiento: "fechanac",
  nacimiento: "fechanac",

  sexo: "sexo",
  genero: "sexo",

  producto: "producto",

  moneda: "moneda",

  remuneracion: "remuneracion",
  sueldo: "remuneracion",
  salario: "remuneracion",

  tipotrab: "tipotrab",
  sede: "sede",
  estadocivil: "estadocivil",
  direccion: "direccion",
  telefono: "telefono",
  correo: "correo",
  email: "correo",
};

const RowSchema = z.object({
  nombres: z.string().optional(),
  primernombre: z.string().optional(),
  segundonombre: z.string().optional(),
  paterno: z.string().optional(),
  materno: z.string().optional(),
  nombrecompleto: z.string().optional(),
  tipodoc: z.string().optional(),
  nrodoc: z.string().optional(),
  fechanac: z.string().optional(),
  sexo: z.string().optional(),
  producto: z.string().optional(),
  moneda: z.string().optional(),
  remuneracion: z.string().optional(),
  tipotrab: z.string().optional(),
  sede: z.string().optional(),
  estadocivil: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  correo: z.string().optional(),
});

function canonicalHeaderSet(headerRow: unknown[]) {
  const raw = headerRow.map((h) => normalizeHeader(h));
  const canon = raw.map((h) => CANON_MAP[h] ?? h);
  return new Set(canon);
}

function hasCanonicalHeaders(headerRow: unknown[], expectedCanonKeys: string[]) {
  const found = canonicalHeaderSet(headerRow);
  return expectedCanonKeys.every((k) => found.has(k));
}

function detectInsurerFromWorkbook(
  wb: XLSX.WorkBook,
  headerRow: unknown[]
): string | null {
  const sheetNames = wb.SheetNames.map((s) => normalizeHeader(s));

  // RIMAC
  if (
    hasCanonicalHeaders(headerRow, [
      "producto",
      "tipodoc",
      "nrodoc",
      "paterno",
      "primernombre",
      "fechanac",
      "sexo",
    ])
  ) {
    return "rimac";
  }

  // MAPFRE
  if (
    sheetNames.some((s) => s.includes("trabajadores")) &&
    (
      // split-name version
      hasCanonicalHeaders(headerRow, ["tipodoc", "nrodoc", "paterno", "nombres"]) ||

      // full-name version
      hasCanonicalHeaders(headerRow, [
        "tipodoc",
        "nrodoc",
        "nombrecompleto",
        "fechanac",
        "remuneracion",
      ])
    )
  ) {
    return "mapfre";
  }

  // LA POSITIVA
  if (
    hasCanonicalHeaders(headerRow, [
      "nombres",
      "paterno",
      "materno",
      "tipodoc",
      "nrodoc",
      "fechanac",
      "moneda",
      "remuneracion",
      "tipotrab",
    ])
  ) {
    return "lapositiva";
  }

  return null;
}

function pickSheetName(wb: XLSX.WorkBook, insurer: string) {
  const insurerLc = insurer.toLowerCase();

  if (insurerLc.includes("mapfre")) {
    const trabajadores = wb.SheetNames.find((s) =>
      normalizeHeader(s).includes("trabajadores")
    );
    if (trabajadores) return trabajadores;
  }

  if (insurerLc.includes("rimac")) {
    const registro = wb.SheetNames.find((s) =>
      normalizeHeader(s).includes("registrodetrabajadores")
    );
    if (registro) return registro;
  }

  return wb.SheetNames[0];
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const insurer = String(form.get("insurer") ?? "").toLowerCase();

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const MAX_BYTES = 8 * 1024 * 1024;
    const MAX_ROWS = 6000;
    const MAX_COLS = 80;

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_BYTES / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const wb = XLSX.read(arrayBuffer, {
      type: "array",
      dense: true,
      cellText: true,
      raw: false,
    });

    if (!wb.SheetNames?.length) {
      return NextResponse.json({ error: "No sheets found" }, { status: 400 });
    }

    const sheetName = pickSheetName(wb, insurer);
    const ws = wb.Sheets[sheetName];

    if (!ws) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 400 });
    }

    const grid: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    });

    if (!grid.length) {
      return NextResponse.json({ error: "Empty sheet" }, { status: 400 });
    }

    const headerRow = (grid[0] ?? []).slice(0, MAX_COLS);
    const detectedInsurer = detectInsurerFromWorkbook(wb, headerRow);

    const headerToKey: (string | null)[] = headerRow.map((h) => {
      const norm = normalizeHeader(h);
      const canon = CANON_MAP[norm];
      if (!canon) return null;
      if (!ALLOWED_KEYS.has(canon)) return null;
      return canon;
    });

    const recognizedColumns = headerToKey.filter(Boolean).length;
    if (recognizedColumns === 0) {
      return NextResponse.json(
        {
          error:
            "No recognizable columns found in the first row. Check the header names and selected sheet.",
        },
        { status: 400 }
      );
    }

    const issues: Issue[] = [];
    const rows: ParsedRow[] = [];

    const dataRows = grid.slice(1, MAX_ROWS + 1);

    dataRows.forEach((r, idx) => {
      const excelRow = idx + 2;
      const out: ParsedRow = { __row: String(excelRow) };

      for (let c = 0; c < headerToKey.length; c++) {
        const key = headerToKey[c];
        if (!key) continue;

        let value = safeString((r as unknown[])?.[c]);

        if (key === "fechanac") value = formatFechaNac(value);
        if (key === "tipodoc") value = value.toUpperCase();
        if (key === "sexo") value = value.toUpperCase();
        if (key === "remuneracion") value = normalizeRemuneracion(value);

        out[key as keyof ParsedRow] = value;
      }

      if (insurer.includes("rimac")) {
        out.tipodoc = normalizeRimacTipoDoc(out.tipodoc);

        const splitNames = [out.primernombre, out.segundonombre]
          .map((x) => safeString(x))
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (splitNames) {
          out.nombres = splitNames;
        } else {
          out.nombres = safeString(out.nombres);
        }

        out.sexo = safeString(out.sexo).toUpperCase();
        out.producto = safeString(out.producto);

        delete (out as Partial<ParsedRow>).primernombre;
        delete (out as Partial<ParsedRow>).segundonombre;
      }

      const hasAnyValue = Object.entries(out).some(
        ([k, v]) => k !== "__row" && String(v ?? "").trim() !== ""
      );

      if (!hasAnyValue) return;

      const parsed = RowSchema.safeParse(out);
      if (!parsed.success) {
        for (const i of parsed.error.issues) {
          issues.push({
            row: excelRow,
            field: String(i.path?.[0] ?? ""),
            message: i.message,
          });
        }
      }

      rows.push(out);
    });

    rows.forEach((r) => {
      const row = Number(r.__row ?? 0);

      if (!String(r.tipodoc ?? "").trim()) {
        issues.push({
          row,
          field: "tipodoc",
          message: "Falta TipoDoc (DNI/CE/PAS o 1/2/6)",
        });
      }

      if (!String(r.nrodoc ?? "").trim()) {
        issues.push({
          row,
          field: "nrodoc",
          message: "Falta NroDoc",
        });
      }

      if (insurer.includes("mapfre")) {
        const hasSplitName = Boolean(
          String(r.paterno ?? "").trim() && String(r.nombres ?? "").trim()
        );

        const hasFullName = Boolean(String(r.nombrecompleto ?? "").trim());

        if (!hasSplitName && !hasFullName) {
          issues.push({
            row,
            field: "nombrecompleto",
            message:
              "Falta NombreCompleto o falta combinación ApePaterno + Nombres",
          });
        }

        if (!String(r.remuneracion ?? "").trim()) {
          issues.push({
            row,
            field: "remuneracion",
            message: "Falta Sueldo",
          });
        } else if (!/^\d+(\.\d+)?$/.test(String(r.remuneracion).trim())) {
          issues.push({
            row,
            field: "remuneracion",
            message: "Sueldo debe usar punto decimal, ejemplo: 100000.53",
          });
        }
      } else if (insurer.includes("rimac")) {
        const hasSplitName = Boolean(
          String(r.paterno ?? "").trim() && String(r.nombres ?? "").trim()
        );
        const hasFullName = Boolean(String(r.nombrecompleto ?? "").trim());

        if (!hasSplitName && !hasFullName) {
          issues.push({
            row,
            field: "nombrecompleto",
            message:
              "Falta NombreCompleto o falta combinación Apellido Paterno + Nombres",
          });
        }

        if (!String(r.producto ?? "").trim()) {
          issues.push({
            row,
            field: "producto",
            message: "Falta Producto",
          });
        } else if (String(r.producto).trim().toLowerCase() !== "salud") {
          issues.push({
            row,
            field: "producto",
            message: "Producto debe ser Salud",
          });
        }

        if (!hasFullName) {
          if (!String(r.paterno ?? "").trim()) {
            issues.push({
              row,
              field: "paterno",
              message: "Falta Apellido Paterno",
            });
          } else if (!onlyLettersSpaces(String(r.paterno))) {
            issues.push({
              row,
              field: "paterno",
              message: "Apellido Paterno solo debe contener letras",
            });
          }

          if (String(r.materno ?? "").trim() && !onlyLettersSpaces(String(r.materno))) {
            issues.push({
              row,
              field: "materno",
              message: "Apellido Materno solo debe contener letras",
            });
          }

          if (!String(r.nombres ?? "").trim()) {
            issues.push({
              row,
              field: "nombres",
              message: "Falta Primer Nombre",
            });
          } else if (!onlyLettersSpaces(String(r.nombres))) {
            issues.push({
              row,
              field: "nombres",
              message: "Nombres solo debe contener letras",
            });
          }
        }

        if (!String(r.fechanac ?? "").trim()) {
          issues.push({
            row,
            field: "fechanac",
            message: "Falta Fecha Nacimiento",
          });
        } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(String(r.fechanac))) {
          issues.push({
            row,
            field: "fechanac",
            message: "Fecha Nacimiento debe usar dd/mm/aaaa",
          });
        }

        if (!String(r.sexo ?? "").trim()) {
          issues.push({
            row,
            field: "sexo",
            message: "Falta Sexo",
          });
        } else if (!["M", "F"].includes(String(r.sexo).trim().toUpperCase())) {
          issues.push({
            row,
            field: "sexo",
            message: "Sexo debe ser M o F",
          });
        }

        if (!["DNI", "CE", "PAS"].includes(String(r.tipodoc ?? "").trim())) {
          issues.push({
            row,
            field: "tipodoc",
            message: "Tipo Documento debe ser 1, 2 o 6",
          });
        }

        const doc = String(r.nrodoc ?? "").trim();
        if (String(r.tipodoc) === "DNI" && !/^\d{8}$/.test(doc)) {
          issues.push({
            row,
            field: "nrodoc",
            message: "DNI debe tener 8 dígitos",
          });
        }
        if (String(r.tipodoc) === "CE" && !/^\d{15}$/.test(doc)) {
          issues.push({
            row,
            field: "nrodoc",
            message: "CE debe tener 15 dígitos",
          });
        }
      } else {
        if (!String(r.nombres ?? "").trim()) {
          issues.push({
            row,
            field: "nombres",
            message: "Falta Nombres",
          });
        }

        if (!String(r.paterno ?? "").trim()) {
          issues.push({
            row,
            field: "paterno",
            message: "Falta Apellido Paterno",
          });
        }
      }
    });

    const mismatchIssues =
      detectedInsurer && detectedInsurer !== insurer
        ? [
            {
              row: 1,
              field: "insurer",
              message: `Wrong template. You selected "${insurer}" but uploaded a "${detectedInsurer}" Excel.`,
            } satisfies Issue,
          ]
        : [];

    const finalIssues = [...mismatchIssues, ...issues];

    const canProceed =
      detectedInsurer === insurer &&
      rows.length > 0 &&
      finalIssues.length === 0;

    const parseToken = canProceed
      ? signParseGuard({
          selectedInsurer: insurer,
          detectedInsurer: detectedInsurer!,
          canProceed: true,
          issuesCount: 0,
        })
      : null;

    return NextResponse.json({
      insurer,
      detectedInsurer,
      canProceed,
      parseToken,
      sheetName,
      totalRows: rows.length,
      rows,
      preview: rows.slice(0, 10),
      issues: finalIssues,
    });
  } catch (error) {
    console.error("parse-trama error:", error);
    return NextResponse.json(
      { error: "Failed to parse file" },
      { status: 500 }
    );
  }
}