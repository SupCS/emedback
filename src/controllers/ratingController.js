const Rating = require("../models/Rating");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const mongoose = require("mongoose"); // Для перевірки ObjectId

// Додати оцінку лікарю після завершеного апоінтменту
exports.rateAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { value } = req.body;
  const patientId = req.user.id;

  if (!value || value < 1 || value > 5) {
    return res.status(400).json({ message: "Оцінка має бути від 1 до 5." });
  }

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({ message: "Невалідний ID апоінтменту." });
  }

  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Апоінтмент не знайдено." });
    }

    if (
      String(appointment.patient) !== patientId ||
      appointment.status !== "passed"
    ) {
      return res
        .status(403)
        .json({ message: "Ви не маєте права оцінювати цей прийом." });
    }

    if (appointment.isRated) {
      return res.status(400).json({ message: "Цей прийом вже оцінено." });
    }

    await Rating.create({
      doctor: appointment.doctor,
      patient: appointment.patient,
      appointment: appointment._id,
      value,
    });

    appointment.isRated = true;
    appointment.ratingValue = value;
    await appointment.save();

    const ratings = await Rating.find({ doctor: appointment.doctor });

    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length
        : 0;

    await Doctor.findByIdAndUpdate(appointment.doctor, {
      rating: avgRating.toFixed(2),
      ratingCount: ratings.length,
    });

    res.status(201).json({ message: "Оцінку успішно збережено." });
  } catch (error) {
    console.error("❌ Помилка при збереженні оцінки:", error);
    res.status(500).json({ message: "Сталася помилка сервера." });
  }
};
