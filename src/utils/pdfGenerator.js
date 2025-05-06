const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const fontkit = require("fontkit");
const { storage } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

async function generatePrescriptionPDF(data) {
  const pdfPath = path.join(
    __dirname,
    "../med-form-generator/template_form.pdf"
  );
  const fontPath = path.join(
    __dirname,
    "../med-form-generator/Roboto-Regular.ttf"
  );

  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = fs.readFileSync(fontPath);
  const customFont = await pdfDoc.embedFont(fontBytes);
  const form = pdfDoc.getForm();

  const fields = {
    institution: data.institution || "",
    patientName: data.patientName || "",
    labResults: data.labResults || "",
    birthDate: data.birthDate || "",
    doctor: data.doctor || "",
    specialResults: data.specialResults || "",
    diagnosis: data.diagnosis || "",
    recommendations: data.treatment || "",
    dateDay: data.dateDay || "",
    dateMonth: data.dateMonth || "",
    dateYear: data.dateYear || "",
    doctorName: data.doctorName || "",
    headName: data.headName || "",
    nakaz1: data.nakaz1 || "",
    nakaz2: data.nakaz2 || "",
    headerName: data.headerName || "",
    codeEDRPOU: data.codeEDRPOU || "",
    headerAddress: data.headerAddress || "",
  };

  for (const [fieldName, value] of Object.entries(fields)) {
    try {
      const field = form.getTextField(fieldName);
      field.setText(value);
      field.updateAppearances(customFont);
    } catch {
      console.warn(`Поле '${fieldName}' не знайдено`);
    }
  }

  const pdfBytes = await pdfDoc.save();
  const filename = `prescriptions/${uuidv4()}.pdf`;
  const file = storage.file(filename);

  await file.save(pdfBytes, {
    metadata: {
      contentType: "application/pdf",
    },
  });

  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
    storage.name
  }/o/${encodeURIComponent(filename)}?alt=media`;

  return publicUrl;
}

module.exports = { generatePrescriptionPDF };
