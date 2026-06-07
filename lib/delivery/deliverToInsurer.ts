// lib/delivery/deliverToInsurer.ts
import { sendEmail } from "@/lib/email/sendEmail";
import { buildInsurerExcelBuffer } from "@/lib/excel/buildInsurerExcel";
import { getInsurerEmail, insurerDisplayName } from "./insurerConfig";

export async function deliverToInsurer({
  insurer,
  rows,
  jobId,
}: {
  insurer: string;
  rows: any[];
  jobId: string;
}) {
  const to = getInsurerEmail(insurer);

  if (!to) {
    throw new Error(`No delivery email configured for insurer: ${insurer}`);
  }

  const excelBuffer = buildInsurerExcelBuffer({
    insurer,
    rows,
  });

  const displayName = insurerDisplayName(insurer);
  const safeInsurer = insurer.toLowerCase();

  await sendEmail({
    to,
    subject: `SCTR ${displayName} - Job ${jobId}`,
    text: [
      `Adjuntamos el archivo Excel actualizado.`,
      ``,
      `Aseguradora: ${displayName}`,
      `Job ID: ${jobId}`,
      ``,
      `Este correo fue generado automáticamente por el sistema SCTR.`,
    ].join("\n"),
    attachments: [
      {
        filename: `${safeInsurer}-ready.xlsx`,
        content: excelBuffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });
}