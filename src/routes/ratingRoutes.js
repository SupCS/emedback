// 📄 routes/ratingRoutes.js
const express = require("express");
const router = express.Router();
const Rating = require("../models/Rating");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const authenticate = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: Оцінки лікарів після завершених прийомів
 */

/**
 * @swagger
 * /ratings/{appointmentId}:
 *   post:
 *     summary: Додати оцінку лікарю після завершеного прийому
 *     tags: [Ratings]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID завершеного апоінтменту
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *     responses:
 *       201:
 *         description: Оцінку збережено успішно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Оцінку збережено.
 *       400:
 *         description: Некоректні дані або оцінка вже існує
 *       403:
 *         description: Користувач не має доступу до оцінки
 *       404:
 *         description: Апоінтмент не знайдено
 *       500:
 *         description: Помилка сервера
 */
router.post("/:appointmentId", authenticate(["patient"]), async (req, res) => {
  const { appointmentId } = req.params;
  const { value } = req.body;
  const patientId = req.user.id;

  if (!value || value < 1 || value > 5) {
    return res.status(400).json({ message: "Оцінка має бути від 1 до 5." });
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
        .json({ message: "Ви не можете оцінити цей прийом." });
    }

    if (appointment.isRated) {
      return res.status(400).json({ message: "Цей прийом вже оцінено." });
    }

    // Створюємо оцінку
    await Rating.create({
      doctor: appointment.doctor,
      patient: appointment.patient,
      appointment: appointment._id,
      value,
    });

    // Ставимо прапорець isRated = true
    appointment.isRated = true;
    appointment.ratingValue = value;
    await appointment.save();

    // Перераховуємо середній рейтинг лікаря
    const ratings = await Rating.find({ doctor: appointment.doctor });
    const avgRating =
      ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length;

    await Doctor.findByIdAndUpdate(appointment.doctor, {
      rating: avgRating.toFixed(2),
      ratingCount: ratings.length,
    });

    res.status(201).json({ message: "Оцінку збережено." });
  } catch (error) {
    console.error("❌ Помилка при збереженні оцінки:", error);
    res.status(500).json({ message: "Помилка сервера." });
  }
});

module.exports = router;
