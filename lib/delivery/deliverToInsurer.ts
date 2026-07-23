/**
 * Insurer delivery service for the SCTR Insurance Document Generator.
 *
 * This module sends the original worker Excel file to the configured insurer
 * after a paid SCTR document has been generated.
 *
 * Responsibilities:
 * - Resolve the destination email address for the selected insurer.
 * - Build a human-readable insurer name for the email subject and body.
 * - Detect the correct attachment content type from the original filename.
 * - Send the original Excel or CSV file through the shared email service.
 *
 * Delivery failures are surfaced to the caller so the route can decide whether
 * to block the request, retry, or log the error.
 */

import { sendEmail } from "@/lib/email/sendEmail";
import { getInsurerEmail, insurerDisplayName } from "./insurerConfig";

/**
 * Determines the MIME type used for the uploaded worker-file attachment.
 *
 * CSV files use the standard `text/csv` MIME type. All other supported workbook
 * filenames fall back to the modern Excel Open XML content type.
 *
 * @param filename - Original uploaded workbook filename.
 * @returns The MIME type used for the email attachment.
 */
function excelContentType(filename: string) {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".csv")) {
    return "text/csv";
  }

  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

/**
 * Parameters required to deliver an original worker workbook to an insurer.
 */
type DeliverToInsurerParams = {
  /**
   * Internal insurer key used to resolve delivery configuration.
   */
  insurer: string;

  /**
   * Unique job or Stripe session identifier included for traceability.
   */
  jobId: string;

  /**
   * Original uploaded workbook contents.
   */
  originalExcelBuffer: Buffer;

  /**
   * Original uploaded filename preserved for the email attachment.
   */
  originalExcelFilename: string;
};

/**
 * Emails the original worker workbook to the configured insurer recipient.
 *
 * @param insurer - Internal insurer key.
 * @param jobId - Job identifier used in the subject and message body.
 * @param originalExcelBuffer - Original workbook contents.
 * @param originalExcelFilename - Original workbook filename.
 * @throws When the insurer has no configured delivery email or email sending
 * fails.
 */
export async function deliverToInsurer({
  insurer,
  jobId,
  originalExcelBuffer,
  originalExcelFilename,
}: DeliverToInsurerParams) {
  /*
   * Resolve the insurer-specific destination address from server-side
   * configuration.
   */
  const to = getInsurerEmail(insurer);

  if (!to) {
    throw new Error(`No delivery email configured for insurer: ${insurer}`);
  }

  /*
   * Use a readable insurer name in the subject and body while retaining the
   * stable insurer key for configuration lookups.
   */
  const displayName = insurerDisplayName(insurer);

  /*
   * Send the original file as an attachment with job details that make the
   * automated delivery easy to identify and audit.
   */
  await sendEmail({
    to,
    subject: `SCTR ${displayName} - Job ${jobId}`,
    text: [
      "Adjuntamos el archivo Excel original usado para generar la constancia.",
      "",
      `Aseguradora: ${displayName}`,
      `Archivo: ${originalExcelFilename}`,
      `Job ID: ${jobId}`,
      "",
      "Este correo fue generado automáticamente por el sistema SCTR.",
    ].join("\n"),
    attachments: [
      {
        filename: originalExcelFilename,
        content: originalExcelBuffer,
        contentType: excelContentType(originalExcelFilename),
      },
    ],
  });
}