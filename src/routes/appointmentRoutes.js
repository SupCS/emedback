const express = require("express");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const DoctorSchedule = require("../models/DoctorSchedule");
const Chat = require("../models/Chat");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();
const { scheduleAppointmentJob } = require("../utils/scheduler");
const { getIoUsers } = require("../socket");
const { db } = require("../config/firebase");

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
      status: { $in: ["pending", "confirmed"] },
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
      status: "pending",
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
 * /appointments/{appointmentId}/status:
 *   patch:
 *     summary: Оновлення статусу запису лікарем
 *     tags: [Appointments]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID запису
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, cancelled]
 *     responses:
 *       200:
 *         description: Статус оновлено
 *       403:
 *         description: Access denied
 *       404:
 *         description: Appointment not found
 *       400:
 *         description: Invalid status
 */
router.patch(
  "/:appointmentId/status",
  authenticate(["doctor"]),
  async (req, res) => {
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!["confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    try {
      const appointment = await Appointment.findById(appointmentId);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found." });
      }

      // Перевіряємо, що саме цей лікар змінює
      if (String(appointment.doctor) !== req.user.id) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Не дозволяємо підтвердження, якщо вже скасовано
      if (appointment.status === "cancelled") {
        return res
          .status(400)
          .json({ message: "Cannot update a cancelled appointment." });
      }

      appointment.status = status;
      await appointment.save();

      // Якщо статус підтверджено — плануємо сповіщення
      if (status === "confirmed") {
        const io = req.app.get("io");
        const users = getIoUsers();

        const chat = await Chat.findOne({
          participants: { $all: [appointment.doctor, appointment.patient] },
        });

        scheduleAppointmentJob(appointment, (appt) => {
          const payload = {
            message: "Ваш прийом починається!",
            appointmentId: appt._id,
            chatId: chat?._id || null,
          };
          console.log("payload: ", payload);
          console.log("users: ", users);
          const patientSocketId = users.get(appt.patient.toString());
          const doctorSocketId = users.get(appt.doctor.toString());

          if (patientSocketId) {
            io.to(patientSocketId).emit("appointmentStart", payload);
          }
          if (doctorSocketId) {
            io.to(doctorSocketId).emit("appointmentStart", payload);
          }
        });
      }

      res.json({ message: `Appointment status updated to ${status}.` });
    } catch (error) {
      console.error("Error updating appointment status:", error);
      res.status(500).json({ message: "Server error." });
    }
  }
);

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

/**
 * @swagger
 * /appointments/{appointmentId}/cancel:
 *   patch:
 *     summary: Скасувати підтверджений запис
 *     tags:
 *       - Appointments
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: appointmentId
 *         in: path
 *         required: true
 *         description: ID запису
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointment cancelled
 *       400:
 *         description: Invalid status or unauthorized
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/:appointmentId/cancel",
  authenticate(["doctor", "patient"]),
  async (req, res) => {
    const { appointmentId } = req.params;
    const { id, role } = req.user;

    try {
      const appointment = await Appointment.findById(appointmentId);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found." });
      }

      // Перевірка чи користувач є учасником запису
      const isOwner =
        (role === "doctor" && String(appointment.doctor) === id) ||
        (role === "patient" && String(appointment.patient) === id);

      if (!isOwner) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Можна скасувати лише якщо статус був confirmed
      if (appointment.status !== "confirmed") {
        return res
          .status(400)
          .json({ message: "Only confirmed appointments can be cancelled." });
      }

      appointment.status = "cancelled";
      await appointment.save();

      res.json({ message: "Appointment cancelled successfully." });
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      res.status(500).json({ message: "Server error." });
    }
  }
);

router.get(
  "/active/:chatId",
  authenticate(["doctor", "patient"]),
  async (req, res) => {
    const { chatId } = req.params;

    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return res.status(404).json({ message: "Чат не знайдено" });

      const [participant1, participant2] = chat.participants;

      const now = new Date();
      const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

      const appointment = await Appointment.findOne({
        doctor: { $in: [participant1, participant2] },
        patient: { $in: [participant1, participant2] },
        status: "confirmed",
        date: today,
      });

      if (!appointment) {
        return res.json({ isActive: false });
      }

      const startDateTime = new Date(
        `${appointment.date}T${appointment.startTime}:00`
      );
      const endDateTime = new Date(
        `${appointment.date}T${appointment.endTime}:00`
      );

      const isActive = now >= startDateTime && now < endDateTime;

      let firestoreCallId = null;

      if (isActive) {
        // 🔍 Пошук WebRTC-кімнати у Firestore за appointmentId
        const callsSnapshot = await db
          .collection("calls")
          .where("appointmentId", "==", appointment._id.toString())
          .get();

        if (!callsSnapshot.empty) {
          firestoreCallId = callsSnapshot.docs[0].id;
        }
      }

      return res.json({
        isActive,
        appointment,
        firestoreCallId, // 🟢 Додано до відповіді
      });
    } catch (error) {
      console.error("❌ Помилка при перевірці апоінтменту:", error);
      res.status(500).json({ message: "Помилка сервера" });
    }
  }
);

module.exports = router;
