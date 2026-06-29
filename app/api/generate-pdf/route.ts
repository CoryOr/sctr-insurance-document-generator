// app/api/generate-pdf/route.ts
import { deliverToInsurer } from "@/lib/delivery/deliverToInsurer";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";
import { renderTemplate } from "@/lib/pdf/templates";
import fs from "fs/promises";
import path from "path";
import Stripe from "stripe";
import QRCode from "qrcode";
import { verifyParseGuard } from "@/lib/parse-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

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

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

async function fileToDataUri(publicRelPath: string) {
  const abs = path.join(process.cwd(), "public", publicRelPath);
  const buf = await fs.readFile(abs);
  const ext = path.extname(abs).slice(1).toLowerCase();

  const mime =
    ext === "png" ? "image/png" :
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    ext === "svg" ? "image/svg+xml" :
    "application/octet-stream";

  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function safeDataUri(publicRelPath: string) {
  try {
    return await fileToDataUri(publicRelPath);
  } catch {
    return null;
  }
}

async function getPaidSession(sessionId: string) {
  if (!stripe) throw new Error("Stripe not configured");
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return session;
}

export async function POST(req: Request) {
  try {
    let body: any;
    let originalExcelBuffer: Buffer | null = null;
    let originalExcelFilename: string | null = null;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const payloadRaw = formData.get("payload");
      if (typeof payloadRaw !== "string") {
        return Response.json({ error: "Missing payload" }, { status: 400 });
      }

      body = JSON.parse(payloadRaw);

      const originalExcel = formData.get("originalExcel");

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
      body = await req.json();
    }

    const insurer = String(body.insurer ?? "").toLowerCase();
    const preview = Boolean(body.preview);
    const sessionId = body.sessionId as string | undefined;
    const parseToken = String(body.parseToken ?? "");
    const company = body.company ?? {};
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!insurer) {
      return Response.json({ error: "Missing insurer" }, { status: 400 });
    }

    if (!parseToken) {
      return Response.json({ error: "Missing parseToken" }, { status: 400 });
    }

    const guard = verifyParseGuard(parseToken);
    if (!guard) {
      return Response.json(
        { error: "Invalid or expired parse token" },
        { status: 400 }
      );
    }

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

      const paidInsurer = String(session.metadata?.insurer ?? "").toLowerCase();
      const paidParseToken = String(session.metadata?.parseToken ?? "");

      if (paidInsurer !== insurer || paidParseToken !== parseToken) {
        return Response.json(
          { error: "Paid session does not match this parsed Excel." },
          { status: 403 }
        );
      }
    }

    const qrSvg = await QRCode.toString("https://constancias.mapfre.com.pe/#/", {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 0,
    });

    let assets: any = {};

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
        sig1: await safeDataUri("pdf-assets/signatures/lapositiva_sig1.png"),
        sig2: await safeDataUri("pdf-assets/signatures/lapositiva_sig2.png"),
      };
    } else if (insurer === "rimac") {
      assets = {
        rimacLogo: await safeDataUri("pdf-assets/logos/rimac.png"),
        rimacSig: await safeDataUri("pdf-assets/signatures/rimac_sig.png"),
      };
    }

    const html = renderTemplate(insurer, { insurer, company, rows, assets });

    const browser = await launchPdfBrowser();
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });

      const pdfBuffer = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
      });

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
      await browser.close();
    }
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "PDF generation failed" },
      { status: 500 }
    );
  }
}