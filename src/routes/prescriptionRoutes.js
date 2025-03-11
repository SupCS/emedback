const express = require("express");
const Prescription = require("../models/Prescription");
const Appointment = require("../models/Appointment");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * /prescriptions/create:
 *   post:
 *     summary: Лікар виписує призначення пацієнту
 *     tags:
 *       - Prescriptions
 *     security:
 *       - JWT: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: ID пацієнта
 *               diagnosis:
 *                 type: string
 *                 description: Діагноз пацієнта
 *               treatment:
 *                 type: string
 *                 description: Опис лікування
 *               validUntil:
 *                 type: string
 *                 format: date
 *                 description: Дата, до якої дійсний рецепт (необов'язково)
 *     responses:
 *       201:
 *         description: Призначення створено успішно
 *       403:
 *         description: Лікар не може виписати призначення без запису за останній місяць
 *       500:
 *         description: Помилка сервера
 */
router.post("/create", authenticate(["doctor"]), async (req, res) => {
  const { patientId, diagnosis, treatment, validUntil } = req.body;
  const doctorId = req.user.id;

  try {
    // Перевіряємо, чи був запис у лікаря за останній місяць
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentAppointment = await Appointment.findOne({
      doctor: doctorId,
      patient: patientId,
      date: { $gte: oneMonthAgo.toISOString().split("T")[0] }, // Шукаємо записи за останній місяць
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

    // Створюємо призначення
    const newPrescription = new Prescription({
      doctor: doctorId,
      patient: patientId,
      diagnosis,
      treatment,
      validUntil: validUntil || null, // Якщо немає строку дії, залишаємо null
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
});

/**
 * @swagger
 * /prescriptions/patient/{patientId}:
 *   get:
 *     summary: Отримати всі призначення пацієнта
 *     tags:
 *       - Prescriptions
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         description: ID пацієнта
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успіх, список призначень
 *       403:
 *         description: Доступ заборонено
 *       500:
 *         description: Помилка сервера
 */
router.get(
  "/patient/:patientId",
  authenticate(["patient", "doctor"]),
  async (req, res) => {
    const { patientId } = req.params;

    // Пацієнт може бачити тільки свої призначення
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
  }
);

/**
 * @swagger
 * /prescriptions/doctor/{doctorId}:
 *   get:
 *     summary: Отримати всі призначення, виписані лікарем
 *     tags:
 *       - Prescriptions
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: doctorId
 *         in: path
 *         required: true
 *         description: ID лікаря
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успіх, список призначень
 *       403:
 *         description: Доступ заборонено
 *       500:
 *         description: Помилка сервера
 */
router.get("/doctor/:doctorId", authenticate(["doctor"]), async (req, res) => {
  const { doctorId } = req.params;

  // Лікар може бачити тільки свої призначення
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
});

module.exports = router;
