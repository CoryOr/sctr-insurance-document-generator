/**
 * Returns a safe message from an unknown caught value.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message
    ? error.message
    : fallback;
}