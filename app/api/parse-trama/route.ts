/**
 * Excel parsing and validation API route for the SCTR Insurance Document Generator.
 *
 * This endpoint accepts an insurer selection and an uploaded Excel workbook,
 * identifies the insurer template represented by the workbook, normalizes the
 * employee data, and applies insurer-specific validation rules.
 *
 * Main responsibilities:
 * - Enforce workbook size, row, and column processing limits.
 * - Select the expected worksheet for MAPFRE, Rímac, or La Positiva.
 * - Normalize header aliases into the application's canonical field names.
 * - Detect which insurer template was uploaded from sheet and column patterns.
 * - Convert worksheet rows into a consistent `ParsedRow` structure.
 * - Report row-level validation issues without discarding usable parsed data.
 * - Sign a parse-guard token only when the workbook is valid and matches the
 *   insurer selected by the user.
 *
 * The resulting parse token is later verified by the checkout and PDF routes
 * so payment and document generation can only continue with the validated
 * workbook.
 */

// app/api/parse-trama/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { z } from "zod";
import { signParseGuard } from "@/lib/parse-guard";

/**
 * XLSX parsing and parse-token signing depend on Node.js-compatible APIs.
 */
export const runtime = "nodejs";

/**
 * Describes a validation problem associated with an Excel row and, when
 * available, a canonical employee field.
 */
type Issue = {
  row: number;
  field?: string;
  message: string;
};

/**
 * Normalized employee record produced from an insurer workbook row.
 *
 * `__row` preserves the original one-based Excel row number so validation
 * messages can point users back to the correct source row.
 */
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

/**
 * Converts an arbitrary worksheet header into a comparison-friendly key.
 *
 * Trimming, lowercasing, removing diacritics, and deleting punctuation allows
 * labels such as "Número Documento", "numero-documento", and "NumeroDocumento"
 * to be matched through the same canonical-header map.
 *
 * @param h - Raw worksheet header value.
 * @returns A lowercase alphanumeric header key.
 */
function normalizeHeader(h: unknown) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Safely converts an unknown cell value into a trimmed string.
 *
 * @param v - Raw cell value.
 * @returns The trimmed string representation, or an empty string for nullish values.
 */
function safeString(v: unknown) {
  return String(v ?? "").trim();
}

/**
 * Normalizes supported birth-date text formats to `dd/mm/yyyy`.
 *
 * Values outside the recognized formats are returned unchanged so the
 * insurer-specific validation phase can report a precise format issue.
 *
 * @param v - Raw birth-date cell value.
 * @returns A normalized date string when possible.
 */
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

/**
 * Normalizes salary text to the decimal format expected by downstream
 * templates and validation.
 *
 * Supported inputs include comma thousands separators, dot decimals, and a
 * single comma used as the decimal separator.
 *
 * @param v - Raw remuneration value.
 * @returns A compact numeric string using a dot as the decimal separator.
 */
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

/**
 * Converts Rímac document-type codes and aliases into canonical labels.
 *
 * @param v - Raw document-type value.
 * @returns `DNI`, `CE`, `PAS`, or the original normalized value.
 */
function normalizeRimacTipoDoc(v: unknown) {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return "";

  if (s === "1" || s === "DNI") return "DNI";
  if (s === "2" || s === "CE") return "CE";
  if (s === "6" || s === "PAS" || s === "PASAPORTE") return "PAS";

  return s;
}

/**
 * Checks whether a name field contains only letters, spaces, and common
 * Spanish accented characters.
 *
 * @param v - Name or surname value to validate.
 */
function onlyLettersSpaces(v: string) {
  return /^[A-ZÁÉÍÓÚÑ ]+$/i.test(v.trim());
}

/**
 * Canonical fields that may be copied from workbook columns into parsed rows.
 *
 * Keeping this allowlist separate from the alias map prevents an unexpected
 * header mapping from creating arbitrary properties on parsed records.
 */
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

/**
 * Maps normalized insurer header aliases to the application's canonical field
 * names.
 *
 * The aliases account for naming differences across insurer templates and
 * common variations in Spanish Excel headers.
 */
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

/**
 * Structural Zod schema for normalized worksheet rows.
 *
 * All recognized fields are optional here because required-field and
 * insurer-specific business rules are evaluated separately with clearer,
 * user-facing issue messages.
 */
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

/**
 * Creates a set of canonical field names represented by a worksheet header row.
 *
 * @param headerRow - Raw first-row cell values.
 * @returns A set containing canonical or normalized header keys.
 */
function canonicalHeaderSet(headerRow: unknown[]) {
  const raw = headerRow.map((h) => normalizeHeader(h));
  const canon = raw.map((h) => CANON_MAP[h] ?? h);
  return new Set(canon);
}

/**
 * Determines whether a header row contains every field required by a template
 * signature.
 *
 * @param headerRow - Raw worksheet header values.
 * @param expectedCanonKeys - Canonical fields required for a match.
 */
function hasCanonicalHeaders(headerRow: unknown[], expectedCanonKeys: string[]) {
  const found = canonicalHeaderSet(headerRow);
  return expectedCanonKeys.every((k) => found.has(k));
}

/**
 * Identifies the insurer template represented by a workbook.
 *
 * Detection uses distinctive canonical column combinations and, for MAPFRE,
 * an expected worksheet-name pattern. The order is intentional because some
 * insurer templates share common employee fields.
 *
 * @param wb - Parsed XLSX workbook.
 * @param headerRow - Header row from the selected worksheet.
 * @returns The detected insurer key, or `null` when no template matches.
 */
function detectInsurerFromWorkbook(
  wb: XLSX.WorkBook,
  headerRow: unknown[]
): string | null {
  const sheetNames = wb.SheetNames.map((s) => normalizeHeader(s));

  /*
   * Rímac is identified by its product, split-name, birth-date, and sex
   * columns.
   */
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

  /*
   * MAPFRE requires a "trabajadores" worksheet and supports either split-name
   * or full-name template variants.
   */
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

  /*
   * La Positiva is identified by its employee names, currency, remuneration,
   * and worker-type columns.
   */
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

/**
 * Selects the worksheet most likely to contain employee enrollment data.
 *
 * MAPFRE and Rímac templates use recognizable sheet names. Other cases fall
 * back to the workbook's first worksheet.
 *
 * @param wb - Parsed XLSX workbook.
 * @param insurer - Insurer selected by the user.
 * @returns The worksheet name to parse.
 */
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

/**
 * Parses and validates an uploaded insurer workbook.
 *
 * Expected multipart form fields:
 * - `file`: Excel workbook containing employee data.
 * - `insurer`: Insurer key selected in the application.
 *
 * @param req - Incoming multipart request.
 * @returns Parsed rows, validation issues, insurer detection results, and a
 * signed parse token when the workbook can proceed.
 */
export async function POST(req: Request) {
  try {
    /*
     * Read the upload and normalize the user-selected insurer for all later
     * template comparisons.
     */
    const form = await req.formData();
    const file = form.get("file");
    const insurer = String(form.get("insurer") ?? "").toLowerCase();

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    /*
     * Bound memory and processing work for uploaded spreadsheets. Rows and
     * columns beyond these limits are intentionally ignored.
     */
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

    /*
     * Parse cell values as display text rather than raw Excel serial values.
     * Dense mode represents the worksheet as arrays, which matches the
     * row-oriented conversion performed below.
     */
    const wb = XLSX.read(arrayBuffer, {
      type: "array",
      dense: true,
      cellText: true,
      raw: false,
    });

    if (!wb.SheetNames?.length) {
      return NextResponse.json({ error: "No sheets found" }, { status: 400 });
    }

    /*
     * Select the insurer-specific employee worksheet when possible, then
     * retrieve the corresponding XLSX worksheet object.
     */
    const sheetName = pickSheetName(wb, insurer);
    const ws = wb.Sheets[sheetName];

    if (!ws) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 400 });
    }

    /*
     * Convert the worksheet into a two-dimensional array. The first row is
     * treated as headers and each later row as one employee record.
     */
    const grid: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    });

    if (!grid.length) {
      return NextResponse.json({ error: "Empty sheet" }, { status: 400 });
    }

    /*
     * Limit header processing, detect the uploaded template, and create a
     * column-index map from workbook headers to canonical employee fields.
     * Unrecognized or disallowed columns are represented by `null` and skipped.
     */
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

    /*
     * Collect normalized rows and all validation issues so the client can show
     * a complete correction list in a single response.
     */
    const issues: Issue[] = [];
    const rows: ParsedRow[] = [];

    const dataRows = grid.slice(1, MAX_ROWS + 1);

    /*
     * Convert each non-header worksheet row into a canonical `ParsedRow`.
     * Excel row numbers begin at two because the first row contains headers.
     */
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

      /*
       * Rímac may split first and second names into separate columns and encode
       * document types numerically. Merge and normalize those fields before
       * validation and template rendering.
       */
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

      /*
       * Ignore completely empty worksheet rows while retaining the original
       * Excel row number for every populated record.
       */
      const hasAnyValue = Object.entries(out).some(
        ([k, v]) => k !== "__row" && String(v ?? "").trim() !== ""
      );

      if (!hasAnyValue) return;

      /*
       * Capture structural schema issues without throwing so all rows can be
       * processed and reported together.
       */
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

    /*
     * Apply required-field and insurer-specific business validation after all
     * rows have been normalized.
     */
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

      /*
       * MAPFRE accepts either a full-name field or a combination of paternal
       * surname and names. Salary is required in normalized numeric format.
       */
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
      /*
       * Rímac validates product, identity, names, birth date, sex, document
       * type, and insurer-specific document-number lengths.
       */
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
        /*
         * The remaining supported path corresponds to La Positiva's core
         * required name fields. Shared document checks were already applied
         * above.
         */
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

    /*
     * Add a workbook-level issue when template detection disagrees with the
     * insurer selected in the interface.
     */
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

    /*
     * A workbook may proceed only when its detected insurer matches the user's
     * selection, at least one employee row exists, and no validation issues
     * remain.
     */
    const canProceed =
      detectedInsurer === insurer &&
      rows.length > 0 &&
      finalIssues.length === 0;

    /*
     * Sign server-trusted parse results only for a fully valid workbook.
     * Checkout and PDF generation later verify this token instead of trusting
     * client-supplied validation state.
     */
    const parseToken = canProceed
      ? signParseGuard({
          selectedInsurer: insurer,
          detectedInsurer: detectedInsurer!,
          canProceed: true,
          issuesCount: 0,
        })
      : null;

    /*
     * Return all parsed rows for document generation, a small preview for the
     * interface, and the complete set of issues for user correction.
     */
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
    /*
     * Log the underlying parser failure on the server while returning a stable,
     * non-sensitive error message to the client.
     */
    console.error("parse-trama error:", error);
    return NextResponse.json(
      { error: "Failed to parse file" },
      { status: 500 }
    );
  }
}