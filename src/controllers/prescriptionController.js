const mongoose = require("mongoose");
const Prescription = require("../models/Prescription");
const Appointment = require("../models/Appointment");
const { generatePrescriptionPDF } = require("../utils/pdfGenerator");
const { getStorage } = require("firebase-admin/storage");
const { v4: uuidv4 } = require("uuid");
exports.createPrescription = async (req, res) => {
  try {
    const {
      patientId,
      institution,
      patientName,
      labResults,
      birthDate,
      doctorText,
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

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Невірний ID пацієнта." });
    }

    if (!diagnosis || !treatment) {
      return res
        .status(400)
        .json({ message: "Діагноз і лікування обов’язкові." });
    }

    if (
      diagnosis.length > 200 ||
      treatment.length > 200 ||
      specialResults.length > 200 ||
      labResults.length > 300
    ) {
      return res
        .status(400)
        .json({ message: "Діагноз або лікування занадто довгі." });
    }

    // Перевірка прийому
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

    // Генерація основного PDF
    const pdfUrl = await generatePrescriptionPDF({
      institution,
      patientName,
      labResults,
      birthDate,
      doctor: doctorText,
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

    // Обробка додаткових PDF-файлів
    const attachments = [];
    const files = req.files || [];

    if (files.length > 4) {
      return res.status(400).json({ message: "Максимум 4 додаткові файли." });
    }

    const storage = getStorage();
    const bucket = storage.bucket();

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const fileName = `attachments/${uuidv4()}_${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
        bucket.name
      }/o/${encodeURIComponent(fileName)}?alt=media`;

      attachments.push({
        title: req.body[`attachments_title_${index}`],
        url: publicUrl,
      });
    }

    // Створення призначення
    const newPrescription = new Prescription({
      doctor: doctorId,
      patient: patientId,
      institution,
      patientName,
      labResults,
      birthDate,
      doctorText,
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
      attachments,
    });

    await newPrescription.save();

    res.status(201).json({
      message: "Призначення створено успішно.",
      prescription: newPrescription,
    });
  } catch (error) {
    console.error("Помилка створення призначення:", error);
    res.status(500).json({ message: "Сталася помилка на сервері." });
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
    const prescriptions = await Prescription.find({
      patient: patientId,
      $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
    })
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
    const prescriptions = await Prescription.find({
      doctor: doctorId,
      $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
    })
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
