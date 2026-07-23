/**
 * Insurer delivery configuration for the SCTR Insurance Document Generator.
 *
 * This module centralizes the supported insurer identifiers and the mapping
 * between each insurer and its delivery-related configuration.
 *
 * Responsibilities:
 * - Define the supported insurer keys used throughout the application.
 * - Resolve insurer-specific destination email addresses from environment
 *   variables.
 * - Convert internal insurer keys into user-friendly display names.
 */

/**
 * Insurer identifiers currently supported by the SCTR workflow.
 */
export type Insurer = "lapositiva" | "rimac" | "mapfre";

/**
 * Resolves the configured SCTR delivery email for an insurer.
 *
 * The lookup is case-insensitive and reads the destination from server-side
 * environment variables.
 *
 * @param insurer - Internal insurer key or equivalent case variation.
 * @returns The configured email address, `undefined` when the environment
 * variable is missing, or `null` when the insurer is unsupported.
 */
export function getInsurerEmail(insurer: string) {
  /*
   * Normalize the input so callers do not need to match the exact casing used
   * by the internal insurer keys.
   */
  const value = insurer.toLowerCase();

  if (value === "lapositiva") {
    return process.env.LAPOSITIVA_SCTR_EMAIL;
  }

  if (value === "rimac") {
    return process.env.RIMAC_SCTR_EMAIL;
  }

  if (value === "mapfre") {
    return process.env.MAPFRE_SCTR_EMAIL;
  }

  return null;
}

/**
 * Converts an internal insurer key into a human-readable display name.
 *
 * Unknown insurer values are returned unchanged so callers can still display
 * the original input rather than losing information.
 *
 * @param insurer - Internal insurer key or arbitrary insurer value.
 * @returns The formatted insurer name used in email subjects and messages.
 */
export function insurerDisplayName(insurer: string) {
  /*
   * Normalize the input for case-insensitive matching.
   */
  const value = insurer.toLowerCase();

  if (value === "lapositiva") {
    return "La Positiva";
  }

  if (value === "rimac") {
    return "RIMAC";
  }

  if (value === "mapfre") {
    return "MAPFRE";
  }

  return insurer;
}