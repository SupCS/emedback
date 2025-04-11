const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const {
  createPrescription,
  getPrescriptionsByPatient,
  getPrescriptionsByDoctor,
} = require("../controllers/prescriptionController");

/**
 * @swagger
 * tags:
 *   name: Prescriptions
 *   description: Операції з медичними призначеннями
 */

/**
 * @swagger
 * /prescriptions/create:
 *   post:
 *     summary: Лікар виписує призначення пацієнту
 *     tags: [Prescriptions]
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
 *               diagnosis:
 *                 type: string
 *               treatment:
 *                 type: string
 *               validUntil:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Призначення створено успішно
 *       403:
 *         description: Лікар не може виписати без запису за останній місяць
 *       500:
 *         description: Помилка сервера
 */
router.post("/create", authenticate(["doctor"]), createPrescription);

/**
 * @swagger
 * /prescriptions/patient/{patientId}:
 *   get:
 *     summary: Отримати всі призначення пацієнта
 *     tags: [Prescriptions]
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
 *         description: Успіх, список призначень
 *       403:
 *         description: Доступ заборонено
 *       500:
 *         description: Помилка сервера
 */
router.get(
  "/patient/:patientId",
  authenticate(["patient", "doctor"]),
  getPrescriptionsByPatient
);

/**
 * @swagger
 * /prescriptions/doctor/{doctorId}:
 *   get:
 *     summary: Отримати всі призначення, виписані лікарем
 *     tags: [Prescriptions]
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
 *         description: Успіх, список призначень
 *       403:
 *         description: Доступ заборонено
 *       500:
 *         description: Помилка сервера
 */
router.get(
  "/doctor/:doctorId",
  authenticate(["doctor"]),
  getPrescriptionsByDoctor
);

module.exports = router;
