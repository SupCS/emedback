const express = require("express");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const DoctorSchedule = require("../models/DoctorSchedule");
const Chat = require("../models/Chat");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();

/**
 * @swagger
 * /appointments/create:
 *   post:
 *     summary: Створення запису (appointment)
 *     tags:
 *       - Appointments
 *     security:
 *       - JWT: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               doctorId:
 *                 type: string
 *                 description: ID лікаря
 *               date:
 *                 type: string
 *                 description: Дата запису (формат YYYY-MM-DD)
 *               startTime:
 *                 type: string
 *                 description: Час початку (формат HH:mm)
 *               endTime:
 *                 type: string
 *                 description: Час завершення (формат HH:mm)
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *       400:
 *         description: Time slot already booked or invalid data
 *       403:
 *         description: Access denied
 *       500:
 *         description: Something went wrong
 */
// Створення запису (appointment) + автоматичне створення чату
router.post("/create", authenticate(["patient"]), async (req, res) => {
  const { doctorId, date, startTime, endTime } = req.body;
  const patientId = req.user.id;

  try {
    // Перевіряємо, чи існує лікар
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    // Отримуємо графік лікаря
    const doctorSchedule = await DoctorSchedule.findOne({
      doctorId: doctorId,
      "availability.date": date,
    });

    if (!doctorSchedule) {
      return res
        .status(400)
        .json({ message: "No available slots on this date." });
    }

    // Перевіряємо, чи існує обраний слот
    const dayAvailability = doctorSchedule.availability.find(
      (day) => day.date === date
    );

    const isSlotAvailable = dayAvailability.slots.some(
      (slot) => slot.startTime === startTime && slot.endTime === endTime
    );

    if (!isSlotAvailable) {
      return res
        .status(400)
        .json({ message: "Selected time slot is not available." });
    }

    // Перевіряємо, чи слот вже зайнятий
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date,
      startTime,
      endTime,
      status: "confirmed",
    });

    if (existingAppointment) {
      return res.status(400).json({ message: "Time slot already booked." });
    }

    // Створюємо новий запис
    const newAppointment = new Appointment({
      doctor: doctorId,
      patient: patientId,
      date,
      startTime,
      endTime,
    });

    await newAppointment.save();

    // Видаляємо обраний тайм-слот зі списку доступних у графіку лікаря
    const updatedAvailability = doctorSchedule.availability
      .map((day) => {
        if (day.date === date) {
          const filteredSlots = day.slots.filter(
            (slot) =>
              !(slot.startTime === startTime && slot.endTime === endTime)
          );

          // Якщо день залишився без слотів — видаляємо його
          if (filteredSlots.length === 0) {
            return null;
          }

          return {
            date: day.date,
            slots: filteredSlots,
          };
        }
        return day;
      })
      .filter((day) => day !== null); // Фільтруємо null значення

    doctorSchedule.availability = updatedAvailability;
    await doctorSchedule.save();

    // **Автоматичне створення чату між лікарем і пацієнтом**
    let chat = await Chat.findOne({
      participants: { $all: [doctorId, patientId] },
    });

    if (!chat) {
      chat = new Chat({
        participants: [doctorId, patientId],
        participantModel: ["Doctor", "Patient"],
      });
      await chat.save();
    }

    res.status(201).json({
      message: "Appointment created successfully.",
      appointment: newAppointment,
      chatId: chat._id, // Повертаємо ID чату
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
});

/**
 * @swagger
 * /appointments/doctor/{doctorId}:
 *   get:
 *     summary: Отримання всіх записів лікаря
 *     tags:
 *       - Appointments
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
 *         description: Success
 *       403:
 *         description: Access denied
 *       500:
 *         description: Something went wrong
 */
// Отримання всіх записів лікаря
router.get("/doctor/:doctorId", authenticate(["doctor"]), async (req, res) => {
  const { doctorId } = req.params;

  // Перевірка: лікар може бачити тільки свої записи
  if (req.user.role === "doctor" && req.user.id !== doctorId) {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    const appointments = await Appointment.find({ doctor: doctorId })
      .populate("patient", "name email phone")
      .sort({ date: 1, startTime: 1 });

    res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
});

/**
 * @swagger
 * /appointments/patient/{patientId}:
 *   get:
 *     summary: Отримання всіх записів пацієнта
 *     tags:
 *       - Appointments
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
 *         description: Success
 *       403:
 *         description: Access denied
 *       500:
 *         description: Something went wrong
 */
// Отримання всіх записів пацієнта
router.get(
  "/patient/:patientId",
  authenticate(["patient", "doctor"]),
  async (req, res) => {
    const { patientId } = req.params;

    // Перевірка: пацієнт може бачити тільки свої записи
    if (req.user.role === "patient" && req.user.id !== patientId) {
      return res.status(403).json({ message: "Access denied." });
    }

    try {
      const appointments = await Appointment.find({ patient: patientId })
        .populate("doctor", "name specialization")
        .sort({ date: 1, startTime: 1 });

      res.status(200).json(appointments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Something went wrong." });
    }
  }
);

module.exports = router;
