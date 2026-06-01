export function esc(s: any) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function baseCss() {
  return `
  @page { size: A4; margin: 14mm 14mm 16mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
  h1 { font-size: 18px; margin: 0; }
  .meta { margin-top: 10px; line-height: 1.35; }
  .meta b { display:inline-block; min-width: 120px; }
  table { width:100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #111; padding: 4px 6px; }
  th { background: #f2f2f2; font-weight: 800; font-size: 10px; text-transform: uppercase; }

  /* Small footer watermark */
  .footer-watermark{
    position: fixed;
    bottom: 8mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 8px;
    color: #777;
    letter-spacing: 2px;
  }

  /* Stronger legal clarity without huge watermark */
  .disclaimer { margin-top: 10px; font-size: 10px; color: #333; }
  `;
}

export function footerWatermark() {
  return `<div class="footer-watermark">Cactus Jack</div>`;
}

export function rosterTable(rows: any[], cols: { key: string; label: string; width?: string }[]) {
  const head = cols
    .map((c) => `<th ${c.width ? `style="width:${c.width}"` : ""}>${esc(c.label)}</th>`)
    .join("");

  const body = rows
    .map((r: any, i: number) => {
      return `<tr>${
        cols.map((c) => {
          const val = c.key === "__nro" ? String(i + 1) : esc(r[c.key]);
          return `<td>${val}</td>`;
        }).join("")
      }</tr>`;
    })
    .join("");

  return `
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

