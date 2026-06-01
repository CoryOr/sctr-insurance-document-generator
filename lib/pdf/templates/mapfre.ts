// lib/pdf/templates/mapfre.ts
import { baseCss, esc, footerWatermark } from "./base";

function fullNameMapfre(r: any) {
  const nombreCompleto = String(r.nombrecompleto ?? "").trim();
  if (nombreCompleto) return nombreCompleto;

  return [r.paterno, r.materno, r.nombres]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function qrMarkup(assets: any) {
  if (!assets.qr) return `<div class="qrPh"></div>`;

  const qr = String(assets.qr ?? "").trim();

  if (qr.startsWith("<svg")) {
    return `<div class="qrWrap">${qr}</div>`;
  }

  return `<img class="qr" src="${qr}" alt="QR" />`;
}

function sealImg(assets: any) {
  return assets.mapfreSeal
    ? `<img class="seal" src="${assets.mapfreSeal}" alt="MAPFRE seal" />`
    : `<div class="sealPh"></div>`;
}


export function renderMapfre(data: any) {
  const assets = data.assets ?? {};
  const company = data.company ?? {};
  const rows = Array.isArray(data.rows) ? data.rows : [];

  const constanciaNro = company.constanciaNro ?? company.constancia ?? "MP/____/________";
  const empresa = company.empresa ?? "";
  const polizaPension = company.polizaPension ?? "";
  const contratoSalud = company.contratoSalud ?? "";
  const vigIni = company.vigenciaInicio ?? "";
  const vigFin = company.vigenciaFin ?? "";

  // Page 2 fields
  const emitidoParaFines = company.emitidoTexto ?? "Se expide la presente, para fines que consideren conveniente.";
  const emisionFechaHora = company.emisionFechaHora ?? ""; // e.g. "29/10/2025 06:08:03 pm"
  const emitidoPor = company.emitidoPor ?? "";             // e.g. "Echegaray Reyes, Enmanuel"
  const signerName = company.signerName ?? "ISAAC RAMIREZ MOLINA";
  const signerRole = company.signerRole ?? "UNIDAD DE RIESGOS DEL TRABAJO";

  const header = `
    <div class="hdr">
      <div class="hdrLeft">
        <div class="addr">Avenida 28 de Julio, 873 Miraflores Lima Peru</div>
        <div class="phones">
          <span class="t">T</span> +511.213.73.73
          <span class="f">F</span> +511.243.31.31
          <span class="web">www.mapfreperu.com</span>
        </div>

        <div class="nro">Nro. De Constancia ${esc(constanciaNro)}</div>
      </div>

      <div class="hdrRight">
        ${
          assets.mapfreLogo
            ? `<img class="logo" src="${assets.mapfreLogo}" alt="MAPFRE" />`
            : `<div class="logoPh"></div>`
        }
        ${qrMarkup(assets)}
      </div>
    </div>
  `;

  const asegurados = `
  <div class="asegBlock">
    <div class="asegTitle">ASEGURADO(S)</div>
    <table class="asegTable">
      <tbody>
        ${rows
          .map((r: any, i: number) => {
            const tipo = (r.tipodoc ?? "DNI").toString().trim() || "DNI";
            const doc = (r.nrodoc ?? "").toString().trim();
            const name = fullNameMapfre(r).toUpperCase();
            return `
              <tr>
                <td class="c1">${i + 1}</td>
                <td class="c2">${esc(tipo)}</td>
                <td class="c3">${esc(doc)}</td>
                <td class="c4">${esc(name)}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  </div>
`;

return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    ${baseCss()}

    @page { size: A4; margin: 12mm 12mm 12mm 6mm; }
    body { margin: 0; font-family: Helvetica; color: #111; }

    /* ===== Header ===== */
    .hdr { display:flex; justify-content:space-between; align-items:flex-start; }
    .hdrLeft { width: 62%; }
    .addr { font-size: 9pt; }
    .phones { margin-top: 2px; font-size: 9pt; }
    .phones .t, .phones .f { color: rgb(255, 0, 0); font-weight: 700; margin: 0 6px 0 10px; }
    .phones .t { margin-left: 0; }
    .phones .web { margin-left: 10px; }
    .nro { margin-top: 18px; font-size: 13pt; font-weight: 400; }

    .hdrRight { width: 38%; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
    .logo { width: 2.15in; height: 0.80in; object-fit: contain; }
    .qr { width: 0.80in; height: 0.80in; object-fit: contain; image-rendering: pixelated; image-rendering: crisp-edges; }
    .logoPh { width: 2.15in; height: 0.80in; }
    .qrPh { width: 0.80in; height: 0.80in; }
    .qrWrap { width: 0.80in; height: 0.80in; display: flex; align-items: center; justify-content: center; }
    .qrWrap svg { width: 100%; height: 100%; display: block; }

    /* ===== Page 1 content ===== */
    .docTitle {
      margin-top: 28px;
      text-align:center;
      font-size: 9pt;
      font-weight: 700;
      text-decoration: underline;
      letter-spacing: .2px;
    }

    .descRow{
      margin-top: 16px;
      display:flex;
      gap: 12mm;
      align-items:flex-start;
    }

    .seal{
      width: 18mm;
      height: 18mm;
      object-fit: contain;
      flex: 0 0 auto;
      position: relative;
      top: -7mm;
      left: -2mm;
    }

    .sealPh{
      width: 18mm;
      height: 18mm;
      flex: 0 0 auto;
      position: relative;
      top: -7mm;
      left: -2mm;
    }

    .desc{
      font-size: 8pt;
      line-height: 1.25;
    }

    .sigRow{
      display:flex;
      gap: 12mm;
      align-items:flex-start;
    }

    .p2wrap .sigRow { margin-top: 18mm; }

    .sigCenter{
      flex: 1;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .asegBlock {
      margin-top: 30px;
      margin-left: 26mm;
      width: calc(100% - 26mm);
    }

    .asegTitle {
      font-size: 9pt;
      font-weight: 700;
    }

    .asegTable {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      margin-top: 6px;
      font-size: 8pt;
      border: none;
    }

    .asegTable tr,
    .asegTable td,
    .asegTable tbody {
      border: none !important;
      outline: none;
      box-shadow: none;
    }

    .asegTable td {
      padding: 0.5pt 0;
      vertical-align: top;
      white-space: nowrap;
      line-height: 1.15;
    }

    .asegTable td.c1 {
      width: 34px;
      text-align: right;
      padding-right: 60px;
    }

    .asegTable td.c2 {
      width: 44px;
      text-align: left;
      padding-right: 22px;
    }

    .asegTable td.c3 {
      width: 108px;
      text-align: left;
      padding-right: 12px;
    }

    .asegTable td.c4 {
      width: auto;
      text-align: left;
      white-space: normal;
    }

    .pageBreak { page-break-before: always; }

    /* ===== Page 2 content ===== */
    .p2wrap {
      display: flex;
      flex-direction: column;
    }

    .issueBlock {
      position: relative;
      top: -22mm;
      margin-left: 0;
      font-size: 10pt;
    }

    .issueBlock .line {
      margin-top: 6px;
    }

    .p2SigArea {
      position: relative;
      margin-top: 2mm;
      min-height: auto;
      display: flex;
      justify-content: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .sigCenter {
      width: 100%;
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .sigImgFull {
      width: 70mm;
      height: auto;
      display: block;
      object-fit: contain;
    }

    .p2Seal {
      position: absolute;
      left: 0mm;
      top: 4mm;
    }

    .mining {
      margin-top: 4mm;
      text-align: center;
      font-size: 9.5pt;
      font-weight: 700;
    }

    .bottomNote {
      margin-top: 18mm;
      font-size: 8.4pt;
      line-height: 1.25;
      font-weight: 700;
    }

    .bottomNote .normal { font-weight: 400; }
    .bottomNote .sp { margin-top: 10px; }
  </style>
</head>

<body>
  <!-- PAGE 1 -->
  ${header}

  <div class="docTitle">CONSTANCIA DE ASEGURAMIENTO</div>

  <div class="descRow">
    ${sealImg(assets)}
    <div class="desc">
      Mediante la presente, dejamos constancia que la(s) persona(s) abajo nombrada(s) está(n) asegurada(s) en nuestra
      compañía, a nombre de la empresa <b>${esc(empresa)}</b> bajo la Póliza de Pensiones No. <b>${esc(polizaPension)}</b>
      y contrato de Salud No. <b>${esc(contratoSalud)}</b>, con vigencia del <b>${esc(vigIni)}</b> hasta el <b>${esc(vigFin)}</b>,
      con las coberturas de Pensiones y Salud por trabajo de riesgo según la ley Nº 26790 y normas complementarias.
    </div>
  </div>

  ${asegurados}

  <div class="pageBreak"></div>

  <!-- PAGE 2 -->
  ${header}

  <div class="p2wrap">
    <div class="issueBlock">
      <div class="line">${esc(emitidoParaFines)}</div>
      ${emisionFechaHora ? `<div class="line">${esc(emisionFechaHora)}</div>` : ``}
      ${emitidoPor ? `<div class="line">${esc(emitidoPor)}</div>` : ``}
    </div>

    <div class="p2SigArea">
      <div class="p2Seal">
        ${sealImg(assets)}
      </div>

      <div class="sigCenter">
        ${assets.sig ? `<img class="sigImgFull" src="${assets.sig}" alt="firma" />` : ``}
      </div>
    </div>

    <div class="mining">La presente cobertura no ampara trabajos en minería subterránea (socavón).</div>

    <div class="bottomNote">
      <div>NOTA: <span class="normal">La presente cobertura esta sujeta a las condiciones señaladas en las pólizas y/o contratos respectivos, quedando sin efecto en
      caso que el contratante no cumpla con el pago oportuno de las primas del SCTR, en el entendido de que a la fecha de emisión del
      presente documento no existe siniestro alguno materia de reclamo.</span></div>

      <div class="sp normal">
        Conforme al art. 24.2 del D.S. N° 003-98-SA, si el contratante declara remuneraciones menores a las consignadas en las planillas y
        boletas de pago de sus trabajadores (Incluidas gratificaciones de Julio y Diciembre), para el cálculo de la prima, incurrirá en un
        supuesto de cobertura insuficiente, y facultará a la aseguradora a solicitar el reembolso de la diferencia entre el importe de la pensión
        calculada con información declarada por el empleador para el cálculo de la prima, y el monto de la pensión que corresponde a lo
        efectivamente percibido por el trabajador.
      </div>

      <div class="sp">
        Puede verificar la validez de este documento, ingresando a <span class="normal">https://constancias.mapfre.com.pe/#/</span>
      </div>

      <div class="sp">
        Validación en línea, a través de nuestro WhatsApp <span class="normal">+51 999919133</span>
      </div>
    </div>
  </div>

  ${footerWatermark?.() ?? ""}

</body>
</html>`;
}
