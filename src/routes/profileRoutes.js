const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadPrescriptionFiles");
const {
  getDoctorProfile,
  getPatientProfile,
  uploadAvatar,
  updateProfile,
  uploadDocument,
  removeDocument,
  getDocuments,
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
  authenticate(["doctor", "patient", "admin"]),
  getPatientProfile
);

/**
 * @swagger
 * /profile/upload-avatar:
 *   post:
 *     summary: Завантаження аватарки користувача у Firebase Storage
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
 *         description: Аватарка успішно завантажена. Повертається публічний URL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 avatar:
 *                   type: string
 *                   example: https://storage.googleapis.com/emed-video.firebasestorage.app/avatars/unique-id.jpg
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

/**
 * @swagger
 * /profile/upload-document:
 *   post:
 *     summary: Завантаження PDF-документа до профілю
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *               - title
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: PDF-файл
 *               title:
 *                 type: string
 *                 description: Назва документа
 *     responses:
 *       200:
 *         description: Документ успішно завантажено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 document:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     url:
 *                       type: string
 *       400:
 *         description: Невалідний запит
 *       500:
 *         description: Помилка сервера
 */
router.post(
  "/upload-document",
  authenticate(["doctor", "patient"]),
  upload.single("document"),
  uploadDocument
);

/**
 * @swagger
 * /profile/remove-document/{docId}:
 *   delete:
 *     summary: Видалення документа з профілю користувача
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: docId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID документа, який потрібно видалити
 *     responses:
 *       200:
 *         description: Документ успішно видалено
 *       404:
 *         description: Документ не знайдено
 *       500:
 *         description: Помилка сервера
 */
router.delete(
  "/remove-document/:docId",
  authenticate(["doctor", "patient"]),
  removeDocument
);

/**
 * @swagger
 * /profile/documents:
 *   get:
 *     summary: Отримання усіх документів користувача
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список документів
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       url:
 *                         type: string
 *       500:
 *         description: Помилка сервера
 */
router.get("/documents", authenticate(["doctor", "patient"]), getDocuments);

module.exports = router;
