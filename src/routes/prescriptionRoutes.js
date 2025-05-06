const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const uploadPrescriptionFiles = require("../middleware/uploadPrescriptionFiles");
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
 *          multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - diagnosis
 *               - treatment
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: ID пацієнта
 *               institution:
 *                 type: string
 *               patientName:
 *                 type: string
 *               labResults:
 *                 type: string
 *               birthDate:
 *                 type: string
 *               doctor:
 *                 type: string
 *               specialResults:
 *                 type: string
 *               diagnosis:
 *                 type: string
 *               treatment:
 *                 type: string
 *               dateDay:
 *                 type: string
 *               dateMonth:
 *                 type: string
 *               dateYear:
 *                 type: string
 *               doctorName:
 *                 type: string
 *               headName:
 *                 type: string
 *               nakaz1:
 *                 type: string
 *               nakaz2:
 *                 type: string
 *               headerName:
 *                 type: string
 *               codeEDRPOU:
 *                 type: string
 *               headerAddress:
 *                 type: string
 *     responses:
 *       201:
 *         description: Призначення створено успішно
 *       403:
 *         description: Лікар не може виписати без запису за останній місяць
 *       400:
 *         description: Невірні або відсутні поля
 *       500:
 *         description: Помилка сервера
 */

router.post(
  "/create",
  authenticate(["doctor"]),
  uploadPrescriptionFiles.array("attachments", 4),
  createPrescription
);

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
  authenticate(["patient", "doctor", "admin"]),
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
  authenticate(["doctor", "admin"]),
  getPrescriptionsByDoctor
);

module.exports = router;
