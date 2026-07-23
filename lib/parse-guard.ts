/**
 * Signed parse-guard token utilities for the SCTR Insurance Document Generator.
 *
 * This module creates and verifies short-lived tokens that preserve the result
 * of an Excel-template validation step.
 *
 * The token protects the checkout and PDF-generation routes from trusting
 * validation data supplied directly by the browser. Each token records:
 * - The insurer selected by the user.
 * - The insurer detected from the uploaded workbook.
 * - Whether the parsed workbook may continue.
 * - The number of validation issues found.
 * - The token expiration time.
 *
 * Tokens are signed with an HMAC-SHA256 signature using the server-only
 * `PARSE_GUARD_SECRET` environment variable.
 *
 * Important:
 * - The payload is signed, not encrypted.
 * - Token contents can be decoded by a client but cannot be modified without
 *   invalidating the signature.
 * - Tokens expire after 30 minutes by default.
 */

import crypto from "node:crypto";

/**
 * Data stored inside a signed parse-guard token.
 */
type ParseGuardPayload = {
  /**
   * Insurer selected by the user before uploading the workbook.
   */
  selectedInsurer: string;

  /**
   * Insurer template detected from the uploaded workbook.
   */
  detectedInsurer: string;

  /**
   * Indicates whether workbook validation completed successfully.
   */
  canProceed: boolean;

  /**
   * Number of validation issues found during parsing.
   */
  issuesCount: number;

  /**
   * Token expiration time expressed as Unix seconds.
   */
  exp: number;
};

/**
 * Returns the secret used to sign and verify parse-guard tokens.
 *
 * @returns The configured parse-guard signing secret.
 * @throws When `PARSE_GUARD_SECRET` is not configured.
 */
function secret() {
  const s = process.env.PARSE_GUARD_SECRET;

  if (!s) {
    throw new Error("Missing PARSE_GUARD_SECRET");
  }

  return s;
}

/**
 * Creates a signed parse-guard token from workbook-validation results.
 *
 * The token format is:
 *
 * `base64url(JSON payload).base64url(HMAC signature)`
 *
 * When no expiration is supplied, the token remains valid for 30 minutes.
 *
 * @param payload - Validation results and optional expiration time.
 * @returns A signed parse-guard token.
 */
export function signParseGuard(
  payload: Omit<ParseGuardPayload, "exp"> & { exp?: number }
) {
  /*
   * Add the default expiration time while still allowing callers to provide an
   * explicit expiry for tests or specialized workflows.
   */
  const finalPayload: ParseGuardPayload = {
    ...payload,
    exp: payload.exp ?? Math.floor(Date.now() / 1000) + 30 * 60,
  };

  /*
   * Serialize and Base64URL-encode the payload so it can be safely included in
   * JSON, Stripe metadata, and HTTP requests.
   */
  const json = JSON.stringify(finalPayload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");

  /*
   * Sign the encoded payload with HMAC-SHA256. Signing the exact encoded value
   * ensures any modification to the payload invalidates the token.
   */
  const sig = crypto
    .createHmac("sha256", secret())
    .update(b64)
    .digest("base64url");

  return `${b64}.${sig}`;
}

/**
 * Verifies and decodes a parse-guard token.
 *
 * Verification checks:
 * - The token contains both payload and signature segments.
 * - The supplied signature matches the expected HMAC signature.
 * - The token payload can be decoded and parsed.
 * - The expiration timestamp exists and has not passed.
 *
 * @param token - Signed parse-guard token received from the client.
 * @returns The verified payload, or `null` when verification fails.
 */
export function verifyParseGuard(token: string): ParseGuardPayload | null {
  try {
    /*
     * Parse the two-part token. Extra or missing segments produce an invalid
     * token because both the encoded payload and signature are required.
     */
    const [b64, sig] = token.split(".");

    if (!b64 || !sig) {
      return null;
    }

    /*
     * Recreate the expected signature from the received payload using the same
     * server-side secret.
     */
    const expected = crypto
      .createHmac("sha256", secret())
      .update(b64)
      .digest("base64url");

    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);

    /*
     * `timingSafeEqual` requires equally sized buffers. Comparing signatures in
     * constant time reduces information leakage through timing differences.
     */
    if (sigBuf.length !== expectedBuf.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    /*
     * Decode the trusted payload only after the signature has been verified.
     */
    const payload = JSON.parse(
      Buffer.from(b64, "base64url").toString("utf8")
    ) as ParseGuardPayload;

    /*
     * Reject tokens with a missing or expired Unix timestamp.
     */
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    /*
     * Malformed Base64URL, invalid JSON, missing configuration, and other
     * verification errors are treated as an invalid token.
     */
    return null;
  }
}