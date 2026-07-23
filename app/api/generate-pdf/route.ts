/**
 * PDF-generation API route for the SCTR Insurance Document Generator.
 *
 * This endpoint receives validated company and employee data, renders the
 * insurer-specific SCTR document template, converts the generated HTML into a
 * PDF, and returns the PDF as a downloadable response.
 *
 * Supported request formats:
 * - `application/json` for payload-only requests.
 * - `multipart/form-data` when the original Excel workbook is included for
 *   downstream delivery to the selected insurer.
 *
 * Production document generation requires:
 * - A valid, unexpired parse-guard token.
 * - A workbook whose detected insurer matches the selected insurer.
 * - A completed Stripe Checkout session associated with the same insurer and
 *   parse token.
 *
 * Non-production preview requests may bypass payment, but previews are disabled
 * in production.
 *
 * After a paid PDF is generated, the original workbook is submitted to the
 * insurer-delivery service. Delivery failures are logged but do not prevent the
 * customer from receiving the generated PDF.
 */

import { deliverToInsurer } from "@/lib/delivery/deliverToInsurer";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";
import { renderTemplate } from "@/lib/pdf/templates";
import fs from "fs/promises";
import path from "path";
import Stripe from "stripe";
import QRCode from "qrcode";
import { verifyParseGuard } from "@/lib/parse-guard";
import { getErrorMessage } from "@/lib/getErrorMessage";
import type {
  PdfAssets,
  PdfCompany,
  PdfRow,
} from "@/lib/pdf/templates/types";

/**
 * PDF generation depends on Node.js APIs, Playwright, the file system, and
 * Buffer support, so this route cannot run in the Edge runtime.
 */
export const runtime = "nodejs";

/**
 * Allows enough execution time for browser startup, HTML rendering, PDF
 * creation, and insurer delivery in supported serverless environments.
 */
export const maxDuration = 60;

/**
 * Launches the Chromium browser used to render insurer templates as PDFs.
 *
 * Vercel uses the serverless-compatible `@sparticuz/chromium` executable and
 * launch arguments. Local development uses the installed Google Chrome
 * channel instead.
 *
 * @returns A Playwright browser instance configured for the current runtime.
 */
async function launchPdfBrowser() {
  const isVercel = process.env.VERCEL === "1";

  if (isVercel) {
    return playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  return playwrightChromium.launch({
    channel: "chrome",
    headless: true,
  });
}

/**
 * Stripe is optional during module initialization so local preview workflows
 * can load the route without a configured secret key. Paid requests will fail
 * explicitly if Stripe has not been configured.
 */
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

/**
 * Reads a file from the public directory and converts it to an embeddable data
 * URI.
 *
 * Embedding assets directly in the generated HTML ensures that logos,
 * signatures, and seals are available to Chromium without additional network
 * requests.
 *
 * @param publicRelPath - File path relative to the application's public folder.
 * @returns A base64-encoded data URI containing the file contents.
 */
async function fileToDataUri(publicRelPath: string) {
  const abs = path.join(process.cwd(), "public", publicRelPath);
  const buf = await fs.readFile(abs);
  const ext = path.extname(abs).slice(1).toLowerCase();

  /*
   * Select the MIME type from the asset extension. Unknown file types fall back
   * to a generic binary MIME type.
   */
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "svg"
          ? "image/svg+xml"
          : "application/octet-stream";

  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * Attempts to convert a public asset into a data URI.
 *
 * Missing optional assets return `null` rather than aborting the complete PDF
 * generation request.
 *
 * @param publicRelPath - File path relative to the public folder.
 * @returns The asset data URI, or `null` when the asset cannot be read.
 */
async function safeDataUri(publicRelPath: string) {
  try {
    return await fileToDataUri(publicRelPath);
  } catch {
    return null;
  }
}

/**
 * Retrieves a Stripe Checkout session used to authorize document generation.
 *
 * @param sessionId - Stripe Checkout session identifier supplied by the client.
 * @returns The matching Stripe Checkout session.
 * @throws When Stripe is not configured or the session cannot be retrieved.
 */
async function getPaidSession(sessionId: string) {
  if (!stripe) throw new Error("Stripe not configured");

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return session;
}

type GeneratePdfBody = {
  insurer?: unknown;
  preview?: unknown;
  sessionId?: unknown;
  parseToken?: unknown;
  company?: PdfCompany;
  rows?: PdfRow[];
};

/**
 * Validates an SCTR generation request, renders the insurer-specific document,
 * creates the PDF, and optionally delivers the original workbook to the
 * insurer.
 *
 * @param req - Incoming JSON or multipart request.
 * @returns A downloadable PDF response or a JSON error response.
 */
export async function POST(req: Request) {
  try {
    /*
     * `body` contains the normalized generation payload. Multipart requests may
     * also include the original Excel workbook required for insurer delivery.
     */
    let body: GeneratePdfBody;
    let originalExcelBuffer: Buffer | null = null;
    let originalExcelFilename: string | null = null;

    const contentType = req.headers.get("content-type") ?? "";

    /*
     * Multipart requests contain:
     * - `payload`: JSON serialized as a form-data string.
     * - `originalExcel`: The workbook originally uploaded by the customer.
     *
     * JSON requests contain only the generation payload.
     */
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const payloadRaw = formData.get("payload");

      if (typeof payloadRaw !== "string") {
        return Response.json({ error: "Missing payload" }, { status: 400 });
      }

      body = JSON.parse(payloadRaw) as GeneratePdfBody;

      const originalExcel = formData.get("originalExcel");

      /*
       * FormData entries may be strings or File-like objects. Confirm the value
       * exposes `arrayBuffer` before reading it as the uploaded workbook.
       */
      if (
        originalExcel &&
        typeof originalExcel === "object" &&
        "arrayBuffer" in originalExcel
      ) {
        const excelFile = originalExcel as File;
        originalExcelFilename = excelFile.name;
        originalExcelBuffer = Buffer.from(await excelFile.arrayBuffer());
      }
    } else {
      body = (await req.json()) as GeneratePdfBody;
    }

    /*
     * Normalize untrusted request values before validation. Missing company data
     * becomes an empty object, and invalid row collections become an empty
     * array so templates receive predictable input shapes.
     */
    const insurer = String(body.insurer ?? "").toLowerCase();
    const preview = Boolean(body.preview);
    const sessionId =
      typeof body.sessionId === "string"
      ? body.sessionId
      : undefined;
    const parseToken = String(body.parseToken ?? "");
    const company = body.company ?? {};
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!insurer) {
      return Response.json({ error: "Missing insurer" }, { status: 400 });
    }

    if (!parseToken) {
      return Response.json({ error: "Missing parseToken" }, { status: 400 });
    }

    /*
     * Verify the signed parse token before trusting workbook-validation results
     * supplied by the client.
     */
    const guard = verifyParseGuard(parseToken);

    if (!guard) {
      return Response.json(
        { error: "Invalid or expired parse token" },
        { status: 400 }
      );
    }

    /*
     * Generate a document only when parsing completed successfully, no workbook
     * issues remain, and both the selected and detected insurers match the
     * insurer requested by this endpoint.
     */
    if (
      !guard.canProceed ||
      guard.issuesCount > 0 ||
      guard.selectedInsurer !== insurer ||
      guard.detectedInsurer !== insurer
    ) {
      return Response.json(
        {
          error: `Wrong Excel template. Selected "${insurer}", detected "${guard.detectedInsurer}".`,
        },
        { status: 400 }
      );
    }

    /*
     * Preview mode is intended for local development and testing. Production
     * requests must always prove payment through a Stripe Checkout session.
     */
    if (preview) {
      if (process.env.NODE_ENV === "production") {
        return Response.json(
          { error: "Preview disabled in production" },
          { status: 403 }
        );
      }
    } else {
      if (!sessionId) {
        return Response.json(
          { error: "Payment required (missing sessionId)" },
          { status: 402 }
        );
      }

      const session = await getPaidSession(sessionId);

      if (session.payment_status !== "paid") {
        return Response.json(
          { error: "Payment required (not paid)" },
          { status: 402 }
        );
      }

      /*
       * Match Stripe metadata against the current request so a paid Checkout
       * session cannot be reused for another insurer or parsed workbook.
       */
      const paidInsurer = String(session.metadata?.insurer ?? "").toLowerCase();
      const paidParseToken = String(session.metadata?.parseToken ?? "");

      if (paidInsurer !== insurer || paidParseToken !== parseToken) {
        return Response.json(
          { error: "Paid session does not match this parsed Excel." },
          { status: 403 }
        );
      }
    }

    /*
     * MAPFRE documents include a QR code pointing to the insurer's certificate
     * verification portal. SVG output stays sharp when printed in the PDF.
     */
    const qrSvg = await QRCode.toString("https://constancias.mapfre.com.pe/#/", {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 0,
    });

    /*
     * Load the logos, seals, and signatures required by the selected insurer.
     * Assets are embedded as data URIs so Chromium can render a self-contained
     * HTML document.
     */
    let assets: PdfAssets = {};

    if (insurer === "mapfre") {
      assets = {
        mapfreLogo: await safeDataUri("pdf-assets/logos/mapfre_peru.png"),
        mapfreSeal: await safeDataUri("pdf-assets/logos/mapfre_seal.png"),
        sig: await safeDataUri("pdf-assets/signatures/mapfre_sig.png"),
        qr: qrSvg,
      };
    } else if (insurer === "lapositiva") {
      assets = {
        insurerLogo: await safeDataUri("pdf-assets/logos/lapositiva.png"),
        insurerLogo2: await safeDataUri("pdf-assets/logos/lapositiva2.png"),
        sig1: await safeDataUri(
          "pdf-assets/signatures/lapositiva_sig1.png"
        ),
        sig2: await safeDataUri(
          "pdf-assets/signatures/lapositiva_sig2.png"
        ),
      };
    } else if (insurer === "rimac") {
      assets = {
        rimacLogo: await safeDataUri("pdf-assets/logos/rimac.png"),
        rimacSig: await safeDataUri("pdf-assets/signatures/rimac_sig.png"),
      };
    }

    /*
     * Render the insurer-specific HTML using the validated company data,
     * employee rows, and embedded document assets.
     */
    const html = renderTemplate(insurer, {
      insurer,
      company,
      rows,
      assets,
    });

    const browser = await launchPdfBrowser();

    try {
      const page = await browser.newPage();

      /*
       * Wait until the complete HTML document has loaded before requesting the
       * PDF. Because assets are embedded, no external network idle wait is
       * required.
       */
      await page.setContent(html, { waitUntil: "load" });

      const pdfBuffer = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
      });

      /*
       * Paid requests also send the customer's original workbook through the
       * configured insurer-delivery workflow. Preview requests never trigger
       * external delivery.
       */
      if (!preview) {
        const jobId = sessionId ?? crypto.randomUUID();

        try {
          if (!originalExcelBuffer || !originalExcelFilename) {
            throw new Error("Original Excel file missing for insurer delivery");
          }

          await deliverToInsurer({
            insurer,
            jobId,
            originalExcelBuffer,
            originalExcelFilename,
          });
        } catch (deliveryError) {
          /*
           * Delivery is intentionally non-blocking for the customer response.
           * The generated PDF is still returned when insurer email delivery
           * fails.
           */
          console.error("Insurer email delivery failed:", deliveryError);
        }
      }

      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="SCTR_${insurer}.pdf"`,
        },
      });
    } finally {
      /*
       * Always close Chromium to release memory and serverless resources,
       * including when rendering or delivery throws an exception.
       */
      await browser.close();
    }
  } catch (error: unknown) {
    return Response.json(
      { error: getErrorMessage(error, "PDF generation failed") },
      { status: 500 }
    );
  }
}