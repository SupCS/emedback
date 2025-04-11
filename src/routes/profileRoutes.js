const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getDoctorProfile,
  getPatientProfile,
  uploadAvatar,
  getAvatar,
  updateProfile,
} = require("../controllers/profileController");

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Операції з профілем користувача
 */

/**
 * @swagger
 * /profile/doctor/{id}:
 *   get:
 *     summary: Отримання профілю лікаря
 *     tags: [Profile]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID лікаря
 *         schema:
 *           type: string
 *           example: 609e1267b5a4a200157d8393
 *     responses:
 *       200:
 *         description: Профіль лікаря успішно отримано
 *       400:
 *         description: Invalid doctor ID
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Something went wrong
 */
router.get("/doctor/:id", getDoctorProfile);

/**
 * @swagger
 * /profile/patient/{id}:
 *   get:
 *     summary: Отримання профілю пацієнта
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID пацієнта
 *         schema:
 *           type: string
 *           example: 609e1267b5a4a200157d8394
 *     responses:
 *       200:
 *         description: Профіль пацієнта успішно отримано
 *       400:
 *         description: Invalid patient ID
 *       403:
 *         description: Access denied
 *       404:
 *         description: Patient not found
 *       500:
 *         description: Something went wrong
 */
router.get(
  "/patient/:id",
  authenticate(["doctor", "patient"]),
  getPatientProfile
);

/**
 * @swagger
 * /profile/upload-avatar:
 *   post:
 *     summary: Завантаження аватарки
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Аватарка оновлена
 *       400:
 *         description: Файл не завантажено
 *       404:
 *         description: Користувача не знайдено
 *       500:
 *         description: Помилка завантаження файлу
 */
router.post(
  "/upload-avatar",
  authenticate(["patient", "doctor"]),
  upload.single("avatar"),
  uploadAvatar
);

// Отримання аватарки за шляхом
router.get("/avatar/*", getAvatar);

/**
 * @swagger
 * /profile/update:
 *   patch:
 *     summary: Оновлення профілю користувача
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Профіль оновлено успішно
 *       400:
 *         description: Невалідні дані
 *       403:
 *         description: Доступ заборонено
 *       404:
 *         description: Користувача не знайдено
 *       500:
 *         description: Помилка сервера
 */
router.patch("/update", authenticate(["doctor", "patient"]), updateProfile);

module.exports = router;
