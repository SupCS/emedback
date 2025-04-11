const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const { rateAppointment } = require("../controllers/ratingController");

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
 *       400:
 *         description: Некоректні дані або оцінка вже існує
 *       403:
 *         description: Користувач не має доступу до оцінки
 *       404:
 *         description: Апоінтмент не знайдено
 *       500:
 *         description: Помилка сервера
 */
router.post("/:appointmentId", authenticate(["patient"]), rateAppointment);

module.exports = router;
