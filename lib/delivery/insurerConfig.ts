// lib/delivery/insurerConfig.ts

export type Insurer = "lapositiva" | "rimac" | "mapfre";

export function getInsurerEmail(insurer: string) {
  const value = insurer.toLowerCase();

  if (value === "lapositiva") return process.env.LAPOSITIVA_SCTR_EMAIL;
  if (value === "rimac") return process.env.RIMAC_SCTR_EMAIL;
  if (value === "mapfre") return process.env.MAPFRE_SCTR_EMAIL;

  return null;
}

export function insurerDisplayName(insurer: string) {
  const value = insurer.toLowerCase();

  if (value === "lapositiva") return "La Positiva";
  if (value === "rimac") return "RIMAC";
  if (value === "mapfre") return "MAPFRE";

  return insurer;
}