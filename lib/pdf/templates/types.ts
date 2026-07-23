/**
 * Primitive value supported by generated PDF templates.
 */
export type PdfValue = string | number | boolean | null | undefined;

/**
 * Parsed employee row supplied to an insurer PDF template.
 */
export type PdfRow = Record<string, PdfValue>;

/**
 * Company, policy, and certificate metadata.
 */
export type PdfCompany = Record<string, PdfValue>;

/**
 * Embedded logo, signature, seal, and QR-code assets.
 */
export type PdfAssets = Record<string, string | null | undefined>;

/**
 * Shared data accepted by insurer PDF renderers.
 */
export type PdfTemplateData = {
  insurer?: string;
  company?: PdfCompany;
  rows?: PdfRow[];
  assets?: PdfAssets;
};