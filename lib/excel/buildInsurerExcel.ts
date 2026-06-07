// // lib/excel/buildInsurerExcel.ts
// import * as XLSX from "xlsx";

// function fullName(row: any) {
//   if (row.nombrecompleto?.trim()) return row.nombrecompleto.trim();

//   return [row.paterno, row.materno, row.nombres]
//     .map((v) => String(v ?? "").trim())
//     .filter(Boolean)
//     .join(" ")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// export function buildInsurerExcelBuffer({
//   insurer,
//   rows,
// }: {
//   insurer: string;
//   rows: any[];
// }) {
//   const normalizedRows = rows.map((row, index) => {
//     if (insurer === "mapfre") {
//       return {
//         Nro: index + 1,
//         TipoDoc: row.tipodoc ?? "",
//         NumDoc: row.nrodoc ?? "",
//         NombreCompleto: fullName(row),
//         FechaNacimiento: row.fechanac ?? "",
//         Sueldo: row.remuneracion ?? "",
//       };
//     }

//     if (insurer === "rimac") {
//       return {
//         Nro: index + 1,
//         ApellidosYNombres: fullName(row),
//         TipoDoc: row.tipodoc ?? "",
//         NroDoc: row.nrodoc ?? "",
//         Sede: row.sede ?? "",
//       };
//     }

//     return {
//       Nro: index + 1,
//       Nombres: row.nombres ?? "",
//       Paterno: row.paterno ?? "",
//       Materno: row.materno ?? "",
//       TipoDoc: row.tipodoc ?? "",
//       NroDoc: row.nrodoc ?? "",
//       FechaNac: row.fechanac ?? "",
//       Moneda: row.moneda ?? "",
//       Remuneracion: row.remuneracion ?? "",
//       TipoTrab: row.tipotrab ?? "",
//       Sede: row.sede ?? "",
//     };
//   });

//   const workbook = XLSX.utils.book_new();
//   const worksheet = XLSX.utils.json_to_sheet(normalizedRows);

//   XLSX.utils.book_append_sheet(workbook, worksheet, "SCTR");

//   return XLSX.write(workbook, {
//     type: "buffer",
//     bookType: "xlsx",
//   }) as Buffer;
// }