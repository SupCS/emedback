const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const {
  addOrUpdateSlot,
  removeSlot,
  getDoctorSchedule,
} = require("../controllers/scheduleController");

/**
 * @swagger
 * tags:
 *   name: Schedule
 *   description: Управління графіком лікарів
 */

/**
 * @swagger
 * /schedule/add:
 *   post:
 *     summary: Додати або оновити слот лікаря
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 description: Дата, до якої додаються слоти (формат YYYY-MM-DD)
 *                 example: "2025-03-01"
 *               slots:
 *                 type: array
 *                 description: Масив слотів з часом початку і завершення
 *                 items:
 *                   type: object
 *                   properties:
 *                     startTime:
 *                       type: string
 *                       description: Час початку (формат HH:mm)
 *                       example: "10:00"
 *                     endTime:
 *                       type: string
 *                       description: Час завершення (формат HH:mm)
 *                       example: "11:00"
 *     responses:
 *       201:
 *         description: Графік успішно оновлено
 *       400:
 *         description: Некоректний формат даних або перетин з існуючими слотами/апоінтментами
 *       500:
 *         description: Внутрішня помилка сервера
 */
router.post("/add", authenticate(["doctor"]), addOrUpdateSlot);

/**
 * @swagger
 * /schedule/remove-slot:
 *   delete:
 *     summary: Видалити слот з графіка лікаря
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 description: Дата, для якої видаляється слот
 *                 example: "2025-03-01"
 *               startTime:
 *                 type: string
 *                 description: Час початку слоту
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 description: Час завершення слоту
 *                 example: "11:00"
 *     responses:
 *       200:
 *         description: Слот успішно видалено
 *       400:
 *         description: Некоректний формат запиту
 *       404:
 *         description: Графік або слот не знайдено
 *       500:
 *         description: Внутрішня помилка сервера
 */
router.delete("/remove-slot", authenticate(["doctor"]), removeSlot);

/**
 * @swagger
 * /schedule/{doctorId}:
 *   get:
 *     summary: Отримати актуальний графік лікаря
 *     tags: [Schedule]
 *     parameters:
 *       - name: doctorId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID лікаря
 *         example: "609e1267b5a4a200157d8393"
 *     responses:
 *       200:
 *         description: Графік успішно отримано
 *       404:
 *         description: Графік не знайдено
 *       500:
 *         description: Внутрішня помилка сервера
 */
router.get("/:doctorId", getDoctorSchedule);

module.exports = router;
