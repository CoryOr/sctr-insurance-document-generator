# SCTR Insurance Document Generator

A full-stack internal web application for generating branded SCTR insurance documents from worker Excel files.

The app allows users to select an insurer, upload a worker/TRAMA spreadsheet, validate the data, preview parsed rows, complete a test Stripe checkout, and generate insurer-branded PDF documents.

## Live Demo

[Try the live demo](https://sctr-insurance-document-generator.vercel.app/)

### Demo Notes

This project uses Stripe test mode for checkout.

* Card: `4242 4242 4242 4242`
* Expiration: any future date
* CVC: any 3 digits

The demo is configured for testing and does not process real payments.

## Project Highlights

* Built and deployed a full-stack Next.js app with API routes, file uploads, payment verification, and server-side PDF generation
* Automated a manual insurance document workflow from Excel upload to branded PDF output
* Implemented insurer-specific validation and backend email delivery logic
* Designed a bilingual Spanish / English user interface
* Integrated Stripe checkout to protect PDF generation behind payment verification

## Screenshots

### Landing Page — Spanish

![Landing Page Spanish](public/screenshots/landing-es.png)

### Landing Page — English

![Landing Page English](public/screenshots/landing-en.png)

### Insurer Selection

![Insurer Selection](public/screenshots/insurer-selection-es.png)

### Upload Workflow

![Upload Workflow](public/screenshots/workflow-es.png)

## Features

* Insurer selection workflow for Rímac, La Positiva, and MAPFRE Perú
* Excel/TRAMA file upload and parsing
* Insurer-specific data validation
* PDF validity date selection
* Parsed worker data preview
* Branded SCTR PDF generation
* Stripe checkout integration with payment verification
* Spanish / English language toggle
* Responsive dark UI built with Tailwind CSS
* Backend insurer delivery workflow that forwards the uploaded Excel/TRAMA file to the configured insurer inbox after successful payment and PDF generation

## Tech Stack

* Next.js
* React
* TypeScript
* Node.js
* Tailwind CSS
* XLSX
* Zod
* Playwright
* Stripe API
* QRCode
* SMTP email delivery
* HTML/CSS

## Why I Built This

This project was built to automate a manual insurance document workflow. Instead of repeatedly formatting SCTR insurance documents by hand, the app parses structured worker files, validates required fields, and generates branded PDF documents for supported insurers.

The goal was to reduce repetitive administrative work, improve data validation, and create a cleaner internal workflow for document generation.

## Core Workflow

1. Select an insurer
2. Upload a worker Excel/TRAMA file
3. Confirm PDF validity dates
4. Parse and validate the file
5. Review parsed worker rows
6. Complete Stripe test checkout
7. Generate the final branded SCTR PDF
8. Automatically deliver the uploaded Excel/TRAMA file to the configured insurer inbox

## Backend Email Delivery Workflow

After the user uploads a worker Excel/TRAMA file, validates the data, completes payment, and generates the SCTR PDF, the backend automatically forwards the original uploaded Excel file to the correct insurer email inbox.

This creates a complete workflow where the user receives the generated SCTR document, while the insurer also receives the required source file for internal processing.

### Supported Insurer Delivery

* La Positiva files are sent to the configured La Positiva delivery inbox
* Rímac files are sent to the configured Rímac delivery inbox
* MAPFRE files are sent to the configured MAPFRE delivery inbox

### Technical Details

* Email delivery is handled server-side through a Next.js API route
* SMTP credentials are stored securely as environment variables
* The frontend does not expose insurer delivery credentials
* The original Excel file is attached to the backend email delivery
* Delivery errors are logged server-side without blocking the user’s PDF download

## Local Development

Clone the repository:

```bash
git clone https://github.com/CoryOr/sctr-insurance-document-generator.git
cd sctr-insurance-document-generator
```

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Environment Variables

Create a `.env.local` file with the required values.

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_ID=
NEXT_PUBLIC_ALLOW_PDF_PREVIEW=
PARSE_GUARD_SECRET=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=

LAPOSITIVA_SCTR_EMAIL=
RIMAC_SCTR_EMAIL=
MAPFRE_SCTR_EMAIL=
```

Do not commit `.env.local`.

## Project Structure

```txt
app/
  page.tsx
  insurers/
    page.tsx
  jobs/
    new/
      page.tsx
      UploadTrama.tsx
      PayAndGenerateButton.tsx
  api/
    parse-trama/
    generate-pdf/
    create-checkout-session/
    verify-checkout-session/

components/
  LanguageToggle.tsx

lib/
  delivery/
  email/
  excel/
  pdf/
  i18n.ts
  parse-guard.ts

public/
  pdf-assets/
  screenshots/
```

## What I Learned

* Built full-stack workflows with the Next.js App Router
* Handled file uploads and spreadsheet parsing
* Created validation flows for insurer-specific Excel templates
* Managed server-side PDF generation with Playwright
* Integrated Stripe checkout with protected document generation
* Designed a bilingual UI with reusable translation data
* Improved UX for internal tools and form-heavy workflows
* Automated a backend workflow connecting PDF generation, payment verification, and insurer email delivery

## Future Improvements

* Add authenticated admin users
* Store generation history
* Add more insurer templates
* Improve automated testing coverage
* Add audit logs for generated documents
