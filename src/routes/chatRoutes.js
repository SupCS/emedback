const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const {
  createChat,
  getChatsByUser,
  sendMessage,
  getMessages,
  getUnreadMessages,
  markMessagesAsRead,
} = require("../controllers/chatController");

/**
 * @swagger
 * tags:
 *   - name: Chat
 *     description: Створення та перегляд чатів
 *   - name: Message
 *     description: Обмін повідомленнями в чаті
 */

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Створити чат між лікарем і пацієнтом
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               userType:
 *                 type: string
 *                 enum: [Doctor, Patient]
 *               recipientId:
 *                 type: string
 *               recipientType:
 *                 type: string
 *                 enum: [Doctor, Patient]
 *     responses:
 *       200:
 *         description: Чат успішно створено
 *       400:
 *         description: Помилка при створенні чату
 */
router.post("/", createChat);

/**
 * @swagger
 * /chat/{userId}:
 *   get:
 *     summary: Отримати всі чати користувача
 *     tags: [Chat]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список чатів
 *       403:
 *         description: Access denied
 */
router.get("/:userId", authenticate(["doctor", "patient"]), getChatsByUser);

/**
 * @swagger
 * /message:
 *   post:
 *     summary: Надіслати повідомлення в чат
 *     tags: [Message]
 *     security:
 *       - JWT: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chatId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Повідомлення надіслано
 */
router.post("/message", authenticate(["doctor", "patient"]), sendMessage);

/**
 * @swagger
 * /message/{chatId}:
 *   get:
 *     summary: Отримати всі повідомлення в чаті
 *     tags: [Message]
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
 *         description: Список повідомлень
 */
router.get(
  "/message/:chatId",
  authenticate(["doctor", "patient"]),
  getMessages
);

router.get("/unread/:userId", getUnreadMessages);

router.post("/read", markMessagesAsRead);

module.exports = router;
