/**
 * RIMAC SCTR PDF template for the SCTR Insurance Document Generator.
 *
 * This module renders the insurer-specific HTML certificate used for RIMAC
 * SCTR health documents. The PDF-generation route loads the returned HTML in
 * Chromium and prints it as an A4 PDF.
 *
 * Responsibilities:
 * - Normalize optional company, asset, and employee-row data.
 * - Build complete employee names from available workbook fields.
 * - Apply the RIMAC-specific certificate layout and print styling.
 * - Render policy, validity-period, workplace, and insured-person information.
 * - Embed the RIMAC logo and authorized signature image when available.
 * - Escape dynamic values before inserting them into generated HTML.
 */

import { baseCss, esc, footerWatermark } from "./base";
import type { PdfRow, PdfTemplateData } from "./types";

/**
 * Converts an unknown value into a trimmed string.
 *
 * @param v - Value to normalize.
 * @returns A trimmed string, or an empty string for nullish values.
 */
function clean(v: unknown) {
  return String(v ?? "").trim();
}

/**
 * Resolves the complete worker name used by the RIMAC certificate.
 *
 * A precombined `nombrecompleto` value takes priority. Otherwise, the function
 * joins the paternal surname, maternal surname, and given names while removing
 * empty values and duplicate whitespace.
 *
 * @param r - Parsed employee record.
 * @returns The normalized complete employee name.
 */
function fullNameRimac(r: PdfRow) {
  const nombreCompleto = clean(r.nombrecompleto);

  if (nombreCompleto) {
    return nombreCompleto;
  }

  return [r.paterno, r.materno, r.nombres]
    .map(clean)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Renders a RIMAC SCTR certificate as a complete HTML document.
 *
 * Expected input sections:
 * - `assets`: Embedded RIMAC logo and signature image data URIs.
 * - `company`: Company, policy, issue, validity-period, site, and signer data.
 * - `rows`: Parsed employee records included in the personnel table.
 *
 * @param data - Template data assembled by the PDF-generation route.
 * @returns A self-contained HTML document ready for Chromium PDF rendering.
 */
export function renderRimac(data: PdfTemplateData) {
  /*
   * Normalize optional top-level sections so missing values do not cause
   * property-access errors during template rendering.
   */
  const assets = data.assets ?? {};
  const company = data.company ?? {};
  const rows = Array.isArray(data.rows) ? data.rows : [];

  /*
   * Resolve certificate, issue, company, policy, validity, site, user, and
   * signer fields from the available company-data aliases.
   */
  const codigo = clean(company.codigo || company.constanciaCodigo);
  const lugar = clean(company.emisionLugar || "Miraflores");
  const fechaLarga = clean(company.emisionFechaLarga);
  const hora = clean(company.emisionHora);

  const empresa = clean(company.empresa);
  const polizaSalud = clean(company.polizaSalud || company.poliza);

  const vigIni = clean(company.vigenciaInicio);
  const vigFin = clean(company.vigenciaFin);

  /*
   * Use the first parsed worker's site when the company-level site is missing.
   */
  const sede = clean(company.sede || rows[0]?.sede);
  const usuario = clean(company.usuario);

  /*
   * Apply the configured signer details, falling back to the default RIMAC
   * representative values used by the current certificate format.
   */
  const firmanteNombre = clean(
    company.firmanteNombre || "Roberto Carlos León Gavonel"
  );

  const firmanteOrg = clean(
    company.firmanteOrg || "Rimac EPS S.A. Entidad Prestadora\nde Salud"
  );

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />

  <style>
    /* Shared print, typography, and footer styles. */
    ${baseCss()}

    /*
     * RIMAC-specific A4 page margins.
     */
    @page {
      size: A4;
      margin: 8mm 20mm 10mm 20mm;
    }

    /*
     * Remove browser defaults and preserve exact print colors.
     */
    html,
    body {
      margin: 0;
      background: #fff !important;
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 100%;
      background: #fff !important;
    }

    /* Header containing the logo, certificate code, place, date, and time. */
    .top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .leftTop {
      width: 46%;
    }

    .rightTop {
      width: 42%;
      text-align: right;
      font-size: 9pt;
      line-height: 1.2;
      padding-top: 10mm;
      font-weight: 500;
    }

    .logo {
      width: 40mm;
      height: auto;
      object-fit: contain;
      display: block;
    }

    .codigo {
      margin-top: 3mm;
      font-size: 9pt;
      font-weight: 500;
    }

    .time {
      margin-top: 5mm;
      text-decoration: underline;
      font-weight: 500;
    }

    /* Main certificate headings and descriptive text. */
    .title {
      margin-top: 9mm;
      text-align: center;
      font-size: 11pt;
      font-weight: 500;
      text-decoration: underline;
      letter-spacing: 0.2px;
    }

    .p {
      margin-top: 5mm;
      font-size: 9pt;
      line-height: 1.22;
    }

    .empresa {
      margin-top: 4.5mm;
      text-align: center;
      font-size: 12pt;
      font-weight: 500;
    }

    .midPolicy {
      margin-top: 4mm;
      text-align: center;
      font-size: 11pt;
      font-weight: 500;
    }

    .midRenewable {
      margin-top: 1mm;
      text-align: center;
      font-size: 9pt;
      font-weight: 500;
    }

    .relTitle {
      margin-top: 7mm;
      margin-bottom: -1mm;
      font-size: 11pt;
      font-weight: 500;
    }

    /*
     * Insured-person table. The border rules intentionally reproduce the
     * heavier grid used by the RIMAC reference certificate.
     */
    table.roster {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 0.8mm;
      font-size: 10pt;
      background: #fff !important;
      border: 2px solid #111;
      border-right: 2px solid #111;
    }

    table.roster th:last-child,
    table.roster td:last-child {
      border-right: 2px solid #111 !important;
    }

    table.roster th,
    table.roster td {
      border: 2px solid #111;
      vertical-align: middle;
      line-height: 1.05;
      background: #fff !important;
    }

    table.roster th {
      text-align: center;
      font-weight: 500;
      font-size: 9.8pt;
      padding: 5px 4px;
    }

    table.roster td {
      padding: 6px 5px;
    }

    /* Fixed column widths for row number, name, document type, and number. */
    .cN {
      width: 8%;
      text-align: center;
    }

    .cName {
      width: 60%;
    }

    .cDocType {
      width: 9%;
      text-align: center;
    }

    .cDocNum {
      width: 24%;
      text-align: right;
      padding-right: 12px !important;
      padding-left: 6px;
    }

    table.roster td.cName {
      padding-left: 2px;
    }

    table.roster td.cDocType {
      text-align: center;
    }

    /*
     * Optional site row displayed above the worker entries.
     */
    .sedeRow td {
      font-size: 12pt;
      font-weight: 500;
      padding: 8px 10px;
      background: #fff !important;
    }

    .footLine {
      margin-top: 4mm;
      font-size: 10pt;
    }

    /*
     * Bottom section containing the issuing user and authorized signature.
     */
    .bottom {
      margin-top: 9mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .usuario {
      font-size: 9.5pt;
      padding-bottom: 4mm;
    }

    .sigWrap {
      width: 76mm;
      text-align: center;
      margin-right: 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .sigImg {
      height: 14mm;
      width: auto;
      object-fit: contain;
      display: block;
      margin: 0 auto 3mm;
    }

    .sigLine {
      width: 58mm;
      border-top: 1px solid #111;
      margin: 0 auto 2mm;
    }

    .sigName {
      font-size: 10pt;
      font-weight: 500;
      line-height: 1.15;
    }

    .sigOrg {
      margin-top: 2px;
      font-size: 9.5pt;
      line-height: 1.15;
      white-space: pre-line;
    }
  </style>
</head>

<body>
  <div class="page">
    <!-- RIMAC logo, certificate code, and issue details. -->
    <div class="top">
      <div class="leftTop">
        ${assets.rimacLogo ? `<img class="logo" src="${assets.rimacLogo}" alt="RIMAC" />` : ``}
        ${codigo ? `<div class="codigo">${esc(codigo)}</div>` : ``}
      </div>

      <div class="rightTop">
        ${fechaLarga ? `<div>${esc(lugar)}, ${esc(fechaLarga)}</div>` : ``}
        ${hora ? `<div class="time">${esc(hora)}</div>` : ``}
      </div>
    </div>

    <!-- Certificate heading and contracting company. -->
    <div class="title">CONSTANCIA</div>

    <div class="p">Por medio de la presente, dejamos constancia que los Señores:</div>

    <div class="empresa">${esc(empresa)}</div>

    <!-- Standard RIMAC SCTR health-policy declaration. -->
    <div class="p">
      De acuerdo a lo establecido en el Decreto Supremo 003-98-SA – Normas Técnicas del Seguro Complementario
      de Trabajo de Riesgo, a la fecha han contratado con Rimac S.A. Entidad Prestadora de Salud la(s) póliza(s) de
      Seguro Complementario de Trabajo de Riesgo siguiente(s):
    </div>

    <div class="midPolicy">SCTR SALUD&nbsp; N° ${esc(polizaSalud)}</div>
    <div class="midRenewable">La constancia es de vigencia mensual y es renovable</div>

    <!-- Validity period and insured-person introduction. -->
    <div class="p">
      La presente constancia tiene vigencia desde ${esc(vigIni)} hasta ${esc(vigFin)}. A solicitud de la empresa contratante
      se emite la presente Constancia detallando a continuación el personal que se encuentra afiliado a la(s) póliza(s)
      antes mencionada(s).
    </div>

    <div class="relTitle">RELACION DE PERSONAL:</div>

    <!-- Insured-person table generated from the validated workbook rows. -->
    <table class="roster">
      <thead>
        <tr>
          <th class="cN">N°</th>
          <th class="cName">APELLIDOS Y NOMBRES</th>
          <th colspan="2">C.E/DNI/PAS/RUC</th>
        </tr>
      </thead>
      <tbody>
        ${sede ? `<tr class="sedeRow"><td colspan="4">SEDE : ${esc(sede)}</td></tr>` : ``}

        ${rows.map((r, i) => {
          /*
           * RIMAC prints employee names and document types in uppercase.
           */
          const name = fullNameRimac(r).toUpperCase();
          const tipo = clean(r.tipodoc || "DNI").toUpperCase();
          const doc = clean(r.nrodoc);

          return `
            <tr>
              <td class="cN">${i + 1}</td>
              <td class="cName">${esc(name)}</td>
              <td class="cDocType">${esc(tipo)}</td>
              <td class="cDocNum">${esc(doc)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>

    <!-- Standard purpose statement printed below the worker list. -->
    <div class="footLine">
      Se expide la presente a solicitud del Asegurado/Contratante para los fines que estime convenientes.
    </div>

    <!-- Issuing user and authorized RIMAC signer. -->
    <div class="bottom">
      <div class="usuario">${usuario ? `Usuario :&nbsp;&nbsp;&nbsp; ${esc(usuario)}` : ``}</div>

      <div class="sigWrap">
        ${assets.rimacSig ? `<img class="sigImg" src="${assets.rimacSig}" alt="firma" />` : ``}
        <div class="sigLine"></div>
        <div class="sigName">${esc(firmanteNombre)}</div>
        <div class="sigOrg">${esc(firmanteOrg)}</div>
      </div>
    </div>
  </div>

  <!-- Shared fixed footer watermark. -->
  ${footerWatermark?.() ?? ""}
</body>
</html>`;
}