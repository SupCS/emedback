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
 *   description: Керування графіком лікарів
 */

/**
 * @swagger
 * /schedule/add:
 *   post:
 *     summary: Додавання або оновлення слоту лікарем
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
 *                 example: "2025-03-01"
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     startTime:
 *                       type: string
 *                       example: "10:00"
 *                     endTime:
 *                       type: string
 *                       example: "11:00"
 *     responses:
 *       201:
 *         description: Schedule updated successfully
 *       400:
 *         description: Invalid data format or overlapping slots
 *       500:
 *         description: Something went wrong
 */
router.post("/add", authenticate(["doctor"]), addOrUpdateSlot);

/**
 * @swagger
 * /schedule/remove-slot:
 *   delete:
 *     summary: Видалення слоту лікарем
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
 *                 example: "2025-03-01"
 *               startTime:
 *                 type: string
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 example: "11:00"
 *     responses:
 *       200:
 *         description: Slot removed successfully
 *       400:
 *         description: Invalid data format
 *       404:
 *         description: Schedule or Slot not found
 *       500:
 *         description: Something went wrong
 */
router.delete("/remove-slot", authenticate(["doctor"]), removeSlot);

/**
 * @swagger
 * /schedule/{doctorId}:
 *   get:
 *     summary: Отримання графіка лікаря
 *     tags: [Schedule]
 *     parameters:
 *       - name: doctorId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "609e1267b5a4a200157d8393"
 *     responses:
 *       200:
 *         description: Schedule fetched successfully
 *       404:
 *         description: No schedule found for this doctor
 *       500:
 *         description: Something went wrong
 */
router.get("/:doctorId", getDoctorSchedule);

module.exports = router;
