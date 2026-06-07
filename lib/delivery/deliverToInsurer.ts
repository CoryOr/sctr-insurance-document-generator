// lib/delivery/deliverToInsurer.ts
import { sendEmail } from "@/lib/email/sendEmail";
import { getInsurerEmail, insurerDisplayName } from "./insurerConfig";

function excelContentType(filename: string) {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".csv")) return "text/csv";

  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

export async function deliverToInsurer({
  insurer,
  jobId,
  originalExcelBuffer,
  originalExcelFilename,
}: {
  insurer: string;
  jobId: string;
  originalExcelBuffer: Buffer;
  originalExcelFilename: string;
}) {
  const to = getInsurerEmail(insurer);

  if (!to) {
    throw new Error(`No delivery email configured for insurer: ${insurer}`);
  }

  const displayName = insurerDisplayName(insurer);

  await sendEmail({
    to,
    subject: `SCTR ${displayName} - Job ${jobId}`,
    text: [
      `Adjuntamos el archivo Excel original usado para generar la constancia.`,
      ``,
      `Aseguradora: ${displayName}`,
      `Archivo: ${originalExcelFilename}`,
      `Job ID: ${jobId}`,
      ``,
      `Este correo fue generado automáticamente por el sistema SCTR.`,
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