const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const { askAI } = require("../controllers/aiController");

/**
 * @swagger
 * tags:
 *   name: AI Assistant
 *   description: Отримати відповідь від медичного AI-помічника
 */

/**
 * @swagger
 * /ai/chat:
 *   post:
 *     summary: Надіслати запит до медичного AI-помічника
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Медичне питання
 *                 example: Як знизити температуру у дитини?
 *     responses:
 *       200:
 *         description: Успішна відповідь від AI
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *       400:
 *         description: Невалідне повідомлення
 *       429:
 *         description: Перевищено ліміт запитів
 *       500:
 *         description: Помилка при зверненні до OpenAI
 */
router.post("/chat", authenticate(["doctor", "patient"]), askAI);

module.exports = router;
