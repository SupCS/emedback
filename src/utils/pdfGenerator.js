const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const fontkit = require("fontkit");
const { storage } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

function formatUkrainianMonth(monthNumber) {
  const months = [
    "січня",
    "лютого",
    "березня",
    "квітня",
    "травня",
    "червня",
    "липня",
    "серпня",
    "вересня",
    "жовтня",
    "листопада",
    "грудня",
  ];
  const index = parseInt(monthNumber, 10) - 1;
  return months[index] || "";
}

function formatBirthDateToShort(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

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

  const formattedBirthDate = data.birthDate
    ? formatBirthDateToShort(data.birthDate)
    : "";
  const formattedMonth = data.dateMonth
    ? formatUkrainianMonth(data.dateMonth)
    : "";
  const shortYear = data.dateYear ? data.dateYear.slice(-2) : "";

  const fields = {
    institution: data.institution || "",
    patientName: data.patientName || "",
    labResults: data.labResults || "",
    birthDate: formattedBirthDate,
    doctor: data.doctor || "",
    specialResults: data.specialResults || "",
    diagnosis: data.diagnosis || "",
    recommendations: data.treatment || "",
    dateDay: data.dateDay || "",
    dateMonth: formattedMonth,
    dateYear: shortYear,
    doctorName: data.doctorName || "",
    headName: data.headName || "",
    nakaz1: data.nakaz1 || "",
    nakaz2: data.nakaz2 || "",
    headerName: data.headerName || "",
    codeEDRPOU: data.codeEDRPOU || "",
    headerAddress: data.headerAddress || "",
  };

  const availableFieldNames = form.getFields().map((field) => field.getName());
  console.log("🔍 Перелік доступних полів у формі:");
  availableFieldNames.forEach((name) => console.log("—", name));

  for (const [fieldName, value] of Object.entries(fields)) {
    if (availableFieldNames.includes(fieldName)) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value);
        field.updateAppearances(customFont);
      } catch (error) {
        console.warn(`Не вдалося оновити поле '${fieldName}':`, error.message);
      }
    } else {
      console.warn(`Поле '${fieldName}' не знайдено у формі`);
    }
  }

  form.flatten();

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
