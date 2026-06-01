// lib/pdf/templates/shared.ts
export function esc(s: any) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function baseCss() {
  return `<style>
    * { box-sizing: border-box; }
    .mgd-watermark {
      position: fixed;
      left: 0; right: 0;
      bottom: 6mm;
      text-align: center;
      font-size: 9px;
      color: rgba(0,0,0,0.35);
      letter-spacing: 0.5px;
    }
  </style>`;
}

export function footerWatermark(text = "Cactus Jack") {
  return `<div class="mgd-watermark">${esc(text)}</div>`;
}

