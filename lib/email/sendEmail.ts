// lib/email/sendEmail.ts
import nodemailer from "nodemailer";

type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export async function sendEmail({
  to,
  subject,
  text,
  attachments,
}: {
  to: string;
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
}) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error("Email SMTP configuration is missing");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    attachments,
  });
}