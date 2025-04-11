const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const { verifyCallAccess } = require("../controllers/callController");

/**
 * @swagger
 * tags:
 *   - name: Calls
 *     description: Доступ до WebRTC кімнат
 */

/**
 * @swagger
 * /calls/{callId}:
 *   get:
 *     summary: Перевірка доступу до WebRTC кімнати
 *     tags: [Calls]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: callId
 *         in: path
 *         required: true
 *         description: ID WebRTC-кімнати у Firestore
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Доступ дозволено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Доступ дозволено.
 *                 appointmentId:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [doctor, patient]
 *       403:
 *         description: Доступ заборонено
 *       404:
 *         description: Кімната або прийом не знайдено
 *       500:
 *         description: Помилка сервера
 */
router.get("/:callId", authenticate(["doctor", "patient"]), verifyCallAccess);

module.exports = router;
