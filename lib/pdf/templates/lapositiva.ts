// lib/pdf/templates/lapositiva.ts
import { esc, baseCss, footerWatermark } from "./shared";

export function renderLaPositiva(data: any) {
  const assets = data.assets ?? {};
  const company = data.company ?? {};
  const rows = Array.isArray(data.rows) ? data.rows : [];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  ${baseCss()}
  <style>
    @page { size: A4; margin: 11mm 12mm 12mm 12mm; }
    body { margin: 0; } /* also remove browser default 8px margin */

    body { font-family: Helvetica; font-size: 11pt; color: #111; }

    :root{
      --logoLeftX: 0mm;
      --logoLeftY: 0mm;
      --logoLeftH: 70px;

      --logoRightX: 0mm;
      --logoRightY: 0mm;
      --logoRightH: 70px;

      --sigH: 18mm;        /* signature image height */
      --sigGap: 3mm;       /* space between signature and names */
      --sigRowTop: 5mm;   /* space above the whole signature row */
    }

    .logos { display:flex; justify-content:space-between; align-items:flex-start; }
    .logoLeft{
      height: var(--logoLeftH, 70px);
      width: auto;
      object-fit: contain;
      transform: translate(var(--logoLeftX, 0mm), var(--logoLeftY, 0mm));
    }
    .logoRight{
      height: var(--logoRightH, 70px);
      width: auto;
      object-fit: contain;
      transform: translate(var(--logoRightX, 0mm), var(--logoRightY, 0mm));
    }

    .topbar { display:flex; justify-content:space-between; align-items:flex-start; margin-top: 6px; }
    .topbar .left { font-size: 11pt; }
    .topbar .right { font-size: 11pt; }

    .center { text-align:center; }
    .title { margin-top: 8pt; font-size: 18pt; font-weight: 800; letter-spacing: .5px; }
    .subtitle { margin-top: 2pt; font-size: 10pt; font-weight: 400; }

    .companyBlock { margin-top: 14px; }
    .companyName { font-weight: 800; text-transform: uppercase; }
    .lineStrong { font-weight: 800; }

    .desc { margin-top: 8pt; line-height: 1.35; }

    /* Policy row like the reference */
    .policyTable{
      width: 92%;              /* match table width */
      margin: 10px auto 0;     /* center it */
      border-collapse: separate;
      border-spacing: 0;
      border: 0.8pt solid #111;
      font-size: 9pt;
    }
    .policyTable td{
      padding: 6px 8px;
      font-weight: 400;
      border: 0;
    }
    .policyTable td + td{
      border-left: 0.8pt solid #111;
    }
    .policyRight{
      text-align: right;
    }

    .sectionTitle { margin-top: 12px; font-weight: 800; text-transform: uppercase; }
    .sedeLine { margin-top: 6px; margin-bottom: 2mm; }

    /* Table */
    table.roster{
      width: 92%;
      margin: 0 auto;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: 0;
      border: 0.8pt solid #111;
      font-size: 9pt;
    }
      
    table.roster th,
    table.roster td{
      padding: 1.5pt 3pt; /* tighter rows */
      line-height: 1.1; /* prevent tall rows*/
      vertical-align: middle;
      text-align: center;

      border: 0;  /* <-- no full border per cell */
      border-right: 0.6pt solid #111; /* draw grid lines */
      border-bottom: 0.6pt solid #111;
    }
    
    table.roster th{
      font-weight: 800;
      text-transform: uppercase;
      text-align: center;
    }

    table.roster th:last-child,
    table.roster td:last-child{
      border-right: 0;   /* avoid double-right border */
    }

    table.roster tbody tr:last-child td{
      border-bottom: 0;  /* avoid double-bottom border */
    }

    /* optional: keep doc column from wrapping */
    table.roster td:nth-child(6),
    table.roster th:nth-child(6){
      white-space: nowrap;
    }

    .extend { margin-top: 10px; }

    .sigRow{ margin-top: var(--sigRowTop); display:flex; justify-content: space-between; gap: 20px; break-inside: avoid; }
    .sigBox { width: 48%; text-align: center; }
    .sigBox b { font-weight: 400; } /* only affects name */
    .sigImg{ height: var(--sigH); width: auto; object-fit: contain; display:block; margin: 0 auto var(--sigGap); /* <-- adds spacing below the image */ }
    .sigSpace{ height: var(--sigH); margin-bottom: var(--sigGap); /* keep same spacing even if no image */ }
    
    /* .sigLine{ margin: 0 auto 3mm; width: 70%; border-top: 1px solid #777; } */

    .noteTitle { margin-top: 14px; font-weight: 400; text-decoration: underline; }
    .noteText { margin-top: 6px; font-size: 10pt; line-height: 1.35; font-weight: 400 }
    .noteText p { margin: 0 0 8pt 0; }   /* spacing between paragraphs */
    .noteText p:last-child { margin-bottom: 0; }

    .pageBreak { page-break-before: always; }
  </style>
</head>

<body>
  <div class="logos">
    ${
      assets.insurerLogo
        ? `<img class="logoLeft" src="${assets.insurerLogo}" alt="logo left" />`
        : `<div style="height:60px;"></div>`
    }

    ${
      assets.insurerLogo2
        ? `<img class="logoRight" src="${assets.insurerLogo2}" alt="logo right" />`
        : `<div style="height:60px;"></div>`
    }
  </div>

  <div class="topbar">
    <div class="left">${esc(company.emisionLugar ?? "Miraflores")}, ${esc(company.emisionFecha ?? "")}</div>
    <div class="right">T.P: / T.S:</div>
  </div>

  <div class="center">
    <div class="title">CONSTANCIA</div>
    <div class="subtitle">SEGURO COMPLEMENTARIO DE TRABAJO DE RIESGO PENSION Y SALUD</div>

    <div class="companyBlock">
      <div class="companyName">${esc(company.empresa ?? "")}</div>
      <div class="lineStrong">VIGENCIA: ${esc(company.vigenciaInicio ?? "")} AL ${esc(company.vigenciaFin ?? "")}</div>
      <div class="lineStrong">ACTIVIDAD: ${esc(company.actividad ?? "")}</div>
    </div>
  </div>

  <div class="desc">
    Por medio del presente dejamos constancia que los asegurados detallados líneas abajo, conforme al Decreto Supremo
    003-98-SA, se encuentran amparados bajo la cobertura de pensión y salud.
  </div>

  <table class="policyTable">
    <tr>
      <td>SCTR PENSIONES Póliza ${esc(company.polizaPension ?? "")}</td>
      <td class="policyRight">SCTR SALUD Contrato ${esc(company.contratoSalud ?? "")}</td>
    </tr>
  </table>

  <div class="sectionTitle">PERSONAL ASEGURADO</div>
  <div class="sedeLine">SEDE: ${esc(company.sede ?? "")}</div>

  <table class="roster">
    <colgroup>
      <col style="width:6%">
      <col style="width:28%">
      <col style="width:18%">
      <col style="width:18%">
      <col style="width:10%">
      <col style="width:20%">
    </colgroup>

    <thead>
      <tr>
        <th>Nro</th>
        <th>Nombres</th>
        <th>Paterno</th>
        <th>Materno</th>
        <th>TipoDoc</th>
        <th>NroDoc</th>
      </tr>
    </thead>

    <tbody>
      ${rows.map((r: any, i: number) => `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td>${esc(r.nombres)}</td>
          <td>${esc(r.paterno)}</td>
          <td>${esc(r.materno)}</td>
          <td style="text-align:center;">${esc(r.tipodoc)}</td>
          <td style="text-align:center;">${esc(r.nrodoc)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="extend">
    Extendemos la presente constancia a solicitud de nuestro cliente: ${esc(company.empresa ?? "")}
  </div>

  <div class="sigRow">
    <div class="sigBox">
      ${assets.sig1 ? `<img class="sigImg" src="${assets.sig1}" alt="firma 1" />` : `<div class="sigSpace"></div>`}
      <div class="sigLine"></div>
      <div>${esc(company.firma1Nombre ?? " ")}</div>
      <div>${esc(company.firma1Cargo ?? " ")}</div>
      <div>${esc(company.firma1Org ?? " ")}</div>
    </div>

    <div class="sigBox">
      ${assets.sig2 ? `<img class="sigImg" src="${assets.sig2}" alt="firma 2" />` : `<div class="sigSpace"></div>`}
      <div class="sigLine"></div>
      <div>${esc(company.firma2Nombre ?? " ")}</div>
      <div>${esc(company.firma2Cargo ?? " ")}</div>
      <div>${esc(company.firma2Org ?? " ")}</div>
    </div>
  </div>

  <div class="noteTitle">Nota:</div>
  <div class="noteText">
    <p>El presente documento está sujeto a la política de suscripción de la Compañía y queda sin efecto en caso que el cliente
    mantenga obligaciones pendientes a favor de la compañía por este concepto.</p>

    <p>Así mismo, esta constancia carecerá de validez respecto de aquellos asegurados sobre los que, con anterioridad a la
    fecha de emisión de este documento, se haya producido un siniestro (fallecimiento y/o accidente de trabajo)
    relacionado al riesgo cubierto por el SCTR. En este supuesto, la Compañía no será responsable de cancelar el beneficio
    de este seguro, debido a la inexistencia del riesgo.</p>

    <p>Tratándose de configuración de invalidez, se aplicará la política de delimitación del riesgo de la Compañía, en caso
    corresponda. Le recordamos cumplir con las medidas de prevención y salud ocupacional establecidas en Minería, DS
    024-2016-EM y normas modificatorias (en caso de actividad minera), o en las normas del sector donde se realice la
    actividad de riesgo, y, poner a disposición de la Compañía, cuando ésta la requiera, las Evaluaciones Médicas
    Ocupacionales de los asegurados</p>
  </div>

  <div class="noteText" style="margin-top:6px; font-weight:800;">
    Cláusula Garantía (SCTR Pensión)
  </div>

  <div class="noteText">
    <p>La presente póliza cubre actividades y servicios que se prestan dentro de la concesión minera en las sedes
    administrativas y/o en superficie. No cubre las actividades de exploración, explotación y extracción de mina realizada en
    SUPERFICIE y/o en SOCAVON o cualquier otra actividad realizada en socavón de una mina. En ese sentido, La
    Positiva no se hará responsable de atender los siniestros ocasionados de las actividades mencionadas anteriormente.</p>
    <p>MARGARCIA</p>
  </div>

  <div style="margin-top: 18px; font-size: 10px;">${esc(company.codigo ?? "")}</div>

  ${footerWatermark("Cactus Jack")}
</body>
</html>`;
}