const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  doctorText: String,
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  institution: String,
  patientName: String,
  labResults: String,
  birthDate: String,
  doctorName: String,
  specialResults: String,
  diagnosis: {
    type: String,
    required: true,
  },
  treatment: {
    type: String,
    required: true,
  },
  dateDay: String,
  dateMonth: String,
  dateYear: String,
  headName: String,
  nakaz1: String,
  nakaz2: String,
  headerName: String,
  codeEDRPOU: String,
  headerAddress: String,
  pdfUrl: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Prescription = mongoose.model("Prescription", prescriptionSchema);
module.exports = Prescription;
