/**
 * Shared SMTP email sender for the SCTR Insurance Document Generator.
 *
 * This module centralizes outbound email delivery for insurer notifications and
 * workbook attachments.
 *
 * Responsibilities:
 * - Read SMTP connection settings from server-side environment variables.
 * - Validate that the required email configuration is present.
 * - Create a Nodemailer transport with the appropriate security mode.
 * - Send plain-text messages with optional file attachments.
 *
 * Configuration is expected through:
 * - `SMTP_HOST`
 * - `SMTP_PORT`
 * - `SMTP_USER`
 * - `SMTP_PASS`
 * - `EMAIL_FROM`
 */

import nodemailer from "nodemailer";

/**
 * File attachment accepted by the shared email service.
 */
type EmailAttachment = {
  /**
   * Filename shown to the email recipient.
   */
  filename: string;

  /**
   * Raw attachment contents.
   */
  content: Buffer;

  /**
   * Optional MIME type used by the recipient's email client.
   */
  contentType?: string;
};

/**
 * Parameters required to send an email.
 */
type SendEmailParams = {
  /**
   * Destination email address.
   */
  to: string;

  /**
   * Email subject line.
   */
  subject: string;

  /**
   * Plain-text email body.
   */
  text: string;

  /**
   * Optional file attachments.
   */
  attachments?: EmailAttachment[];
};

/**
 * Sends a plain-text email through the configured SMTP server.
 *
 * @param to - Destination email address.
 * @param subject - Email subject line.
 * @param text - Plain-text message body.
 * @param attachments - Optional files included with the message.
 * @throws When required SMTP configuration is missing or delivery fails.
 */
export async function sendEmail({
  to,
  subject,
  text,
  attachments,
}: SendEmailParams) {
  /*
   * Load all SMTP settings at request time so deployment configuration controls
   * the email provider and sender identity.
   */
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  /*
   * Fail before creating the transport when any required credential or sender
   * value is missing.
   */
  if (!host || !user || !pass || !from) {
    throw new Error("Email SMTP configuration is missing");
  }

  /*
   * Port 465 uses implicit TLS. Other common SMTP ports, including 587, start
   * unencrypted and upgrade through STARTTLS when supported by the server.
   */
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  /*
   * Nodemailer rejects this promise when the SMTP server cannot accept or
   * deliver the message, allowing callers to log or handle the failure.
   */
  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    attachments,
  });
}