/**
 * Internationalization definitions for the SCTR Insurance Document Generator.
 *
 * This module centralizes the application's supported languages and all
 * user-facing copy used by the landing page, insurer-selection page, new-job
 * workflow, and Excel upload interface.
 *
 * Responsibilities:
 * - Define the supported language codes.
 * - Normalize language values received from URL query parameters.
 * - Provide Spanish and English translations through a shared object.
 *
 * Page components access translations with patterns such as:
 * `text[lang].landing`, `text[lang].insurers`, and `text[lang].upload`.
 */

/**
 * Language codes currently supported by the application.
 */
export type Lang = "es" | "en";

/**
 * Normalizes a URL language parameter into a supported application language.
 *
 * Query parameters may arrive as a string, an array of strings, or a missing
 * value. English is selected only when the resolved value is exactly `"en"`;
 * every other value falls back to Spanish.
 *
 * @param value - Raw language value received from the URL or router.
 * @returns A supported application language code.
 */
export function getLang(value?: string | string[] | null): Lang {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "en" ? "en" : "es";
}

/**
 * Localized application copy grouped first by language and then by page or
 * workflow section.
 *
 * The Spanish and English objects intentionally share the same property shape
 * so components can switch languages without changing their rendering logic.
 */
export const text = {
  /**
   * Spanish application copy.
   */
  es: {
    /**
     * Landing-page headings, descriptions, calls to action, and workflow steps.
     */
    landing: {
      eyebrow: "Automatización interna de seguros",
      titleA: "Generador de",
      titleB: "Documentos SCTR",
      description:
        "Carga archivos Excel de trabajadores, valida datos de seguros de construcción y genera documentos PDF SCTR con la marca de la aseguradora.",
      scroll: "↓ DESPLAZARSE PARA COMENZAR",
      howItWorks: "¿Cómo funciona?",
      beginTitle: "Iniciar una nueva generación SCTR",
      beginDescription:
        "Continúa al flujo de carga, selecciona los detalles de la aseguradora, procesa el archivo de trabajadores y genera los documentos finales.",
      beginButton: "Comenzar generación",

      /**
       * Ordered steps shown in the landing-page workflow preview.
       */
      workflowSteps: [
        {
          number: "01",
          title: "Cargar archivo TRAMA / Excel",
          description: "Importa los datos de trabajadores para generar el SCTR.",
        },
        {
          number: "02",
          title: "Validar datos de la aseguradora",
          description:
            "El sistema revisa los campos requeridos antes de crear el documento.",
        },
        {
          number: "03",
          title: "Generar PDFs de seguro",
          description:
            "Genera documentos PDF listos para revisión o entrega.",
        },
      ],
    },

    /**
     * Insurer-selection page labels and insurer-specific descriptions.
     */
    insurers: {
      back: "← VOLVER",
      eyebrow: "Selección de aseguradora",
      selectButton: "Seleccionar aseguradora",
      descriptions: {
        rimac: "Genera documentos SCTR usando Rímac.",
        lapositiva: "Genera documentos SCTR usando La Positiva Vida.",
        mapfre: "Genera documentos SCTR usando MAPFRE Perú.",
      },
    },

    /**
     * New-job page labels displayed before the upload workflow.
     */
    jobs: {
      back: "← VOLVER",
      eyebrow: "Nuevo trabajo SCTR",
      title: "Cargar archivo de trabajadores",
      selectedInsurer: "Aseguradora seleccionada:",
    },

    /**
     * Excel upload, validity-period, parsing, validation, and preview labels.
     */
    upload: {
      step1: "Paso 1",
      uploadTitle: "Cargar archivo",
      uploadDescription:
        "Elige el archivo de trabajadores para {insurer} y confirma el rango de vigencia del PDF antes de procesarlo.",
      chooseFile: "Elegir archivo Excel",
      supports: "Soporta archivos .xlsx, .xls y .csv",
      vigenciaTitle: "Periodo de vigencia",
      vigenciaDescription:
        "El rango de fechas que aparecerá en la constancia generada.",
      startDate: "Fecha de inicio",
      endDate: "Fecha de fin",
      invalidDates: "La fecha de inicio no puede ser posterior a la fecha de fin.",
      step2: "Paso 2",
      fileReady: "Archivo listo para procesar",
      noFile: "No se ha seleccionado archivo",
      fileReadyDescription:
        "Procesa el archivo para validar los datos de los trabajadores.",
      noFileDescription: "Carga un archivo Excel de trabajadores para continuar.",
      parseFile: "Procesar archivo",
      parsing: "Procesando…",
      previewPdf: "Vista previa PDF DEV ONLY",
      sheet: "Hoja",
      rows: "Filas",
      detectedTemplate: "Plantilla detectada",
      dataPreview: "Vista previa de datos",
      dataPreviewDescription: "Mostrando las primeras 50 filas procesadas.",
      issuesFound: "Problemas encontrados",
      wrongTemplateA: "Plantilla de Excel incorrecta. Seleccionaste",
      wrongTemplateB: "pero cargaste un archivo de",
      wrongTemplateC: "El pago está bloqueado.",
    },
  },

  /**
   * English application copy.
   */
  en: {
    /**
     * Landing-page headings, descriptions, calls to action, and workflow steps.
     */
    landing: {
      eyebrow: "Internal Insurance Automation",
      titleA: "SCTR Insurance",
      titleB: "Document Generator",
      description:
        "Upload workers' Excel files, validate construction insurance data, and generate branded SCTR PDF documents for supported insurers.",
      scroll: "↓ SCROLL TO BEGIN",
      howItWorks: "How it works",
      beginTitle: "Start a new SCTR generation",
      beginDescription:
        "Continue to the upload workflow, select insurer details, process the worker file, and generate the final branded documents.",
      beginButton: "Begin Generation",

      /**
       * Ordered steps shown in the landing-page workflow preview.
       */
      workflowSteps: [
        {
          number: "01",
          title: "Upload TRAMA / Excel File",
          description: "Import worker data for SCTR document generation.",
        },
        {
          number: "02",
          title: "Validate Insurer Data",
          description:
            "The system checks required fields before document creation.",
        },
        {
          number: "03",
          title: "Generate Insurance PDFs",
          description:
            "Generate clean insurance PDFs ready for review or delivery.",
        },
      ],
    },

    /**
     * Insurer-selection page labels and insurer-specific descriptions.
     */
    insurers: {
      back: "← BACK",
      eyebrow: "Insurer Selection",
      selectButton: "Select insurer",
      descriptions: {
        rimac: "Generate SCTR documents using Rímac.",
        lapositiva: "Generate SCTR documents using La Positiva Vida.",
        mapfre: "Generate SCTR documents using MAPFRE Perú.",
      },
    },

    /**
     * New-job page labels displayed before the upload workflow.
     */
    jobs: {
      back: "← BACK",
      eyebrow: "New SCTR Job",
      title: "Upload worker file",
      selectedInsurer: "Selected insurer:",
    },

    /**
     * Excel upload, validity-period, parsing, validation, and preview labels.
     */
    upload: {
      step1: "Step 1",
      uploadTitle: "Upload File",
      uploadDescription:
        "Choose the worker file for {insurer} and confirm the PDF validity range before parsing.",
      chooseFile: "Choose Excel file",
      supports: "Supports .xlsx, .xls, and .csv files",
      vigenciaTitle: "Vigencia Period",
      vigenciaDescription:
        "The date range that will appear in the generated insurance certificate.",
      startDate: "Start date",
      endDate: "End date",
      invalidDates: "Start date cannot be after end date.",
      step2: "Step 2",
      fileReady: "File ready to parse",
      noFile: "No file selected",
      fileReadyDescription: "Parse the file to validate the worker data.",
      noFileDescription: "Upload a worker Excel file to continue.",
      parseFile: "Parse file",
      parsing: "Parsing…",
      previewPdf: "Preview PDF DEV ONLY",
      sheet: "Sheet",
      rows: "Rows",
      detectedTemplate: "Detected template",
      dataPreview: "Data preview",
      dataPreviewDescription: "Showing the first 50 parsed rows.",
      issuesFound: "Issues found",
      wrongTemplateA: "Wrong Excel template. You selected",
      wrongTemplateB: "but uploaded a",
      wrongTemplateC: "file. Payment is blocked.",
    },
  },
};