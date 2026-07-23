//note: I haven't worked with Pacifico yet so this is not important

import { baseCss, esc, footerWatermark, rosterTable } from "./base";
import type { PdfTemplateData } from "./types";

export function renderPacifico(
  { insurer = "", company = {}, rows = [] }: PdfTemplateData
) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${baseCss()}</style>
</head>
<body>

  <h1>CONSTANCIA SCTR (FORMATO MGD)</h1>
  <div class="meta">
    <div><b>Aseguradora:</b> ${esc(insurer)}</div>
    <div><b>Empresa:</b> ${esc(company.empresa)}</div>
    <div><b>RUC:</b> ${esc(company.ruc)}</div>
    <div><b>Vigencia:</b> ${esc(company.vigenciaInicio)} al ${esc(company.vigenciaFin)}</div>
    <div><b>Actividad:</b> ${esc(company.actividad)}</div>
    <div><b>Sede:</b> ${esc(company.sede)}</div>
    <div><b>Póliza Pensión:</b> ${esc(company.polizaPension ?? "")}</div>
    <div><b>Contrato Salud:</b> ${esc(company.contratoSalud ?? "")}</div>
  </div>

  <div class="disclaimer">
    Documento generado por MGD para fines internos/operativos. No constituye constancia emitida por la aseguradora.
  </div>

  ${rosterTable(rows, [
    { key: "__nro", label: "Nro", width: "40px" },
    { key: "nombres", label: "Nombres" },
    { key: "paterno", label: "Paterno" },
    { key: "materno", label: "Materno" },
    { key: "tipodoc", label: "TipoDoc", width: "70px" },
    { key: "nrodoc", label: "NroDoc", width: "95px" },
  ])}

  ${footerWatermark()}
</body>
</html>`;
}
