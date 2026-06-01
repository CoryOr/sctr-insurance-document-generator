// lib/pdf/templates/index.ts
import { renderLaPositiva } from "./lapositiva";
import { renderRimac } from "./rimac";
import { renderPacifico } from "./pacifico";
import { renderMapfre } from "./mapfre";
import { renderProtecta } from "./protecta";

export type InsurerKey = "lapositiva" | "rimac" | "pacifico" | "mapfre" | "protecta" | "generic";

export function normalizeInsurerKey(insurer: string): InsurerKey {
  const v = (insurer || "").toLowerCase();
  if (v.includes("positiva")) return "lapositiva";
  if (v.includes("rimac")) return "rimac";
  if (v.includes("pacifico")) return "pacifico";
  if (v.includes("mapfre")) return "mapfre";
  if (v.includes("protecta") || v.includes("grandia")) return "protecta";
  return "generic";
}

export function renderTemplate(insurer: string, data: any) {
  const key = normalizeInsurerKey(insurer);

  switch (key) {
    case "lapositiva": return renderLaPositiva(data);
    case "rimac": return renderRimac(data);
    case "pacifico": return renderPacifico(data);
    case "mapfre": return renderMapfre(data);
    case "protecta": return renderProtecta(data);
    default: return renderLaPositiva(data); // or a generic template
  }
}

