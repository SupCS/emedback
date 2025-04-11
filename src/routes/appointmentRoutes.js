const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const {
  createAppointment,
  updateAppointmentStatus,
  getDoctorAppointments,
  getPatientAppointments,
  cancelAppointment,
  getActiveAppointmentByChat,
} = require("../controllers/appointmentController");

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Керування записами (appointments)
 */

/**
 * @swagger
 * /appointments/create:
 *   post:
 *     summary: Створення запису (appointment)
 *     tags: [Appointments]
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
 *               date:
 *                 type: string
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
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
router.post("/create", authenticate(["patient"]), createAppointment);

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
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Access denied
 *       404:
 *         description: Appointment not found
 */
router.patch(
  "/:appointmentId/status",
  authenticate(["doctor"]),
  updateAppointmentStatus
);

/**
 * @swagger
 * /appointments/doctor/{doctorId}:
 *   get:
 *     summary: Отримання всіх записів лікаря
 *     tags: [Appointments]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: doctorId
 *         in: path
 *         required: true
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
router.get(
  "/doctor/:doctorId",
  authenticate(["doctor"]),
  getDoctorAppointments
);

/**
 * @swagger
 * /appointments/patient/{patientId}:
 *   get:
 *     summary: Отримання всіх записів пацієнта
 *     tags: [Appointments]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
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
router.get(
  "/patient/:patientId",
  authenticate(["patient", "doctor"]),
  getPatientAppointments
);

/**
 * @swagger
 * /appointments/{appointmentId}/cancel:
 *   patch:
 *     summary: Скасувати підтверджений запис
 *     tags: [Appointments]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: appointmentId
 *         in: path
 *         required: true
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
  cancelAppointment
);

/**
 * @swagger
 * /appointments/active/{chatId}:
 *   get:
 *     summary: Перевірка активного апоінтменту по ID чату
 *     tags: [Appointments]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: chatId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointment active status
 *       404:
 *         description: Чат не знайдено
 *       500:
 *         description: Server error
 */
router.get(
  "/active/:chatId",
  authenticate(["doctor", "patient"]),
  getActiveAppointmentByChat
);

module.exports = router;
