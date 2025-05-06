const mongoose = require("mongoose");
const Prescription = require("../models/Prescription");
const Appointment = require("../models/Appointment");
const { generatePrescriptionPDF } = require("../utils/pdfGenerator");

exports.createPrescription = async (req, res) => {
  const {
    patientId,
    institution,
    patientName,
    labResults,
    birthDate,
    doctor,
    specialResults,
    diagnosis,
    treatment,
    dateDay,
    dateMonth,
    dateYear,
    doctorName,
    headName,
    nakaz1,
    nakaz2,
    headerName,
    codeEDRPOU,
    headerAddress,
  } = req.body;

  const doctorId = req.user.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Невірний ID пацієнта." });
    }

    if (!diagnosis || !treatment) {
      return res
        .status(400)
        .json({ message: "Діагноз і лікування є обов'язковими полями." });
    }

    if (
      diagnosis.length > 100 ||
      treatment.length > 100 ||
      specialResults.length > 100 ||
      labResults.length > 100
    ) {
      return res
        .status(400)
        .json({ message: "Діагноз або лікування занадто довгі." });
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentAppointment = await Appointment.findOne({
      doctor: doctorId,
      patient: patientId,
      date: { $gte: oneMonthAgo.toISOString().split("T")[0] },
    });

    if (!recentAppointment) {
      return res.status(403).json({
        message:
          "Ви не можете виписати призначення без прийому за останній місяць.",
      });
    }

    const pdfUrl = await generatePrescriptionPDF({
      institution,
      patientName,
      labResults,
      birthDate,
      doctor,
      specialResults,
      diagnosis,
      treatment,
      dateDay,
      dateMonth,
      dateYear,
      doctorName,
      headName,
      nakaz1,
      nakaz2,
      headerName,
      codeEDRPOU,
      headerAddress,
    });

    const newPrescription = new Prescription({
      doctor: doctorId,
      patient: patientId,
      institution,
      patientName,
      labResults,
      birthDate,
      doctor,
      specialResults,
      diagnosis,
      treatment,
      dateDay,
      dateMonth,
      dateYear,
      doctorName,
      headName,
      nakaz1,
      nakaz2,
      headerName,
      codeEDRPOU,
      headerAddress,
      pdfUrl,
    });

    await newPrescription.save();

    res.status(201).json({
      message: "Призначення створено успішно.",
      prescription: newPrescription,
    });
  } catch (error) {
    console.error("Помилка створення призначення:", error);
    res
      .status(500)
      .json({ message: "Сталася помилка на сервері. Спробуйте пізніше." });
  }
};

exports.getPrescriptionsByPatient = async (req, res) => {
  const { patientId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    return res.status(400).json({ message: "Невірний ID пацієнта." });
  }

  if (req.user.role === "patient" && req.user.id !== patientId) {
    return res.status(403).json({ message: "Доступ заборонено." });
  }

  try {
    const prescriptions = await Prescription.find({ patient: patientId })
      .populate("doctor", "name specialization")
      .sort({ createdAt: -1 });

    res.status(200).json(prescriptions);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Сталася помилка на сервері. Спробуйте пізніше." });
  }
};

exports.getPrescriptionsByDoctor = async (req, res) => {
  const { doctorId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({ message: "Невірний ID лікаря." });
  }

  if (req.user.role === "doctor" && req.user.id !== doctorId) {
    return res.status(403).json({ message: "Доступ заборонено." });
  }

  try {
    const prescriptions = await Prescription.find({ doctor: doctorId })
      .populate("patient", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json(prescriptions);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Сталася помилка на сервері. Спробуйте пізніше." });
  }
};
