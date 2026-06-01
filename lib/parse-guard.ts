// lib/parse-guard.ts
import crypto from "node:crypto";

type ParseGuardPayload = {
  selectedInsurer: string;
  detectedInsurer: string;
  canProceed: boolean;
  issuesCount: number;
  exp: number; // unix seconds
};

function secret() {
  const s = process.env.PARSE_GUARD_SECRET;
  if (!s) throw new Error("Missing PARSE_GUARD_SECRET");
  return s;
}

export function signParseGuard(
  payload: Omit<ParseGuardPayload, "exp"> & { exp?: number }
) {
  const finalPayload: ParseGuardPayload = {
    ...payload,
    exp: payload.exp ?? Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
  };

  const json = JSON.stringify(finalPayload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret())
    .update(b64)
    .digest("base64url");

  return `${b64}.${sig}`;
}

export function verifyParseGuard(token: string): ParseGuardPayload | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;

    const expected = crypto
      .createHmac("sha256", secret())
      .update(b64)
      .digest("base64url");

    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);

    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const payload = JSON.parse(
      Buffer.from(b64, "base64url").toString("utf8")
    ) as ParseGuardPayload;

    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}