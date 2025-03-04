const express = require("express");
const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Appointment = require("../models/Appointment");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Створити чат між лікарем і пацієнтом
 *     tags:
 *       - Chat
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
// Створення чату між лікарем та пацієнтом (або між лікарями)
router.post("/", async (req, res) => {
  try {
    const { userId, userType, recipientId, recipientType } = req.body;

    // Заборона для пацієнтів спілкуватися між собою
    if (userType === "Patient" && recipientType === "Patient") {
      return res
        .status(400)
        .json({ message: "Patients cannot chat with other patients." });
    }

    // Перевіряємо, чи чат вже існує
    let chat = await Chat.findOne({
      participants: { $all: [userId, recipientId] },
    });

    if (!chat) {
      chat = new Chat({
        participants: [userId, recipientId],
        participantModel: [userType, recipientType],
      });
      await chat.save();
    }

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: "Error creating chat", error });
  }
});

/**
 * @swagger
 * /chat/{userId}:
 *   get:
 *     summary: Отримати всі чати користувача (тільки для самого користувача)
 *     tags:
 *       - Chat
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: ID користувача
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список чатів
 *       403:
 *         description: Access denied
 *       500:
 *         description: Помилка сервера
 */
// Отримати всі чати користувача (тільки якщо він учасник чату)
router.get(
  "/:userId",
  authenticate(["doctor", "patient"]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const loggedInUserId = req.user.id; // ID користувача з токену

      // Перевіряємо, чи ID у запиті збігається з ID залогіненого користувача
      if (userId !== loggedInUserId) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Шукаємо чати, де userId є учасником
      const chats = await Chat.find({ participants: userId }).populate(
        "participants"
      );

      res.status(200).json(chats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching chats", error });
    }
  }
);

/**
 * @swagger
 * /message:
 *   post:
 *     summary: Надіслати повідомлення в чат
 *     tags:
 *       - Message
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
 *       403:
 *         description: Користувач не є учасником чату
 *       400:
 *         description: Чат не знайдено або повідомлення порожнє
 *       500:
 *         description: Помилка сервера
 */
// Надсилання повідомлення (з перевіркою автентифікації)
router.post(
  "/message",
  authenticate(["doctor", "patient"]),
  async (req, res) => {
    try {
      const { chatId, content } = req.body;
      const senderId = req.user.id; // ID користувача з токену

      // Перевіряємо, чи чат існує
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(400).json({ message: "Chat not found." });
      }

      // Перевіряємо, чи користувач є учасником чату
      if (!chat.participants.includes(senderId)) {
        return res
          .status(403)
          .json({ message: "You are not a participant in this chat." });
      }

      // Перевірка, чи повідомлення не порожнє
      if (!content || content.trim().length === 0) {
        return res
          .status(400)
          .json({ message: "Message content cannot be empty." });
      }

      // Створюємо повідомлення
      const message = new Message({
        chat: chatId,
        sender: senderId,
        content,
      });

      await message.save();
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Error sending message", error });
    }
  }
);

/**
 * @swagger
 * /message/{chatId}:
 *   get:
 *     summary: Отримати всі повідомлення в чаті
 *     tags:
 *       - Message
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: chatId
 *         in: path
 *         required: true
 *         description: ID чату
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список повідомлень
 *       403:
 *         description: Користувач не є учасником чату
 *       500:
 *         description: Помилка сервера
 */
// Отримання всіх повідомлень у чаті (з перевіркою доступу)
router.get(
  "/message/:chatId",
  authenticate(["doctor", "patient"]),
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;

      // Перевіряємо, чи чат існує
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(400).json({ message: "Chat not found." });
      }

      // Перевіряємо, чи користувач є учасником чату
      if (!chat.participants.includes(userId)) {
        return res
          .status(403)
          .json({ message: "You are not a participant in this chat." });
      }

      // Отримуємо повідомлення
      const messages = await Message.find({ chat: chatId }).sort({
        createdAt: 1,
      });
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: "Error fetching messages", error });
    }
  }
);

module.exports = router;
