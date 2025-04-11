const Prescription = require("../models/Prescription");
const Appointment = require("../models/Appointment");

// Лікар створює нове призначення пацієнту
exports.createPrescription = async (req, res) => {
  const { patientId, diagnosis, treatment, validUntil } = req.body;
  const doctorId = req.user.id;

  try {
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
          "Ви не можете виписати призначення, якщо пацієнт не мав запису до вас за останній місяць.",
      });
    }

    if (!diagnosis || !treatment) {
      return res
        .status(400)
        .json({ message: "Діагноз і лікування є обов'язковими." });
    }

    if (validUntil) {
      const validUntilDate = new Date(validUntil);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (validUntilDate < today) {
        return res.status(400).json({
          message: "Дата закінчення дії рецепту не може бути в минулому.",
        });
      }
    }

    const newPrescription = new Prescription({
      doctor: doctorId,
      patient: patientId,
      diagnosis,
      treatment,
      validUntil: validUntil || null,
    });

    await newPrescription.save();

    res.status(201).json({
      message: "Призначення створено успішно.",
      prescription: newPrescription,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Помилка сервера." });
  }
};

// Отримати призначення конкретного пацієнта
exports.getPrescriptionsByPatient = async (req, res) => {
  const { patientId } = req.params;

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
    res.status(500).json({ message: "Помилка сервера." });
  }
};

// Отримати призначення, які виписав певний лікар
exports.getPrescriptionsByDoctor = async (req, res) => {
  const { doctorId } = req.params;

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
    res.status(500).json({ message: "Помилка сервера." });
  }
};
