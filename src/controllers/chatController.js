const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const { encrypt, decrypt } = require("../utils/encryption");

// Створення чату між двома користувачами
exports.createChat = async (req, res) => {
  try {
    const { userId, userType, recipientId, recipientType } = req.body;

    if (userType === "Patient" && recipientType === "Patient") {
      return res.status(400).json({
        message: "Пацієнти не можуть створювати чати з іншими пацієнтами.",
      });
    }

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
    res.status(500).json({ message: "Помилка при створенні чату", error });
  }
};

// Отримання чатів конкретного користувача
exports.getChatsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const loggedInUserId = req.user.id;

    if (userId !== loggedInUserId) {
      return res.status(403).json({ message: "Доступ заборонено." });
    }

    const chats = await Chat.find({ participants: userId }).populate(
      "participants"
    );
    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: "Помилка при отриманні чатів", error });
  }
};

// Надсилання повідомлення в чат
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const senderId = req.user.id;
    const senderModel = req.user.role === "doctor" ? "Doctor" : "Patient";

    if (!content || content.trim().length === 0) {
      return res
        .status(400)
        .json({ message: "Повідомлення не може бути порожнім." });
    }

    if (content.length > 1000) {
      return res.status(400).json({ message: "Повідомлення надто довге." });
    }

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(senderId)) {
      return res
        .status(403)
        .json({ message: "Чат не знайдено або доступ заборонено." });
    }

    const sender = await (senderModel === "Doctor" ? Doctor : Patient)
      .findById(senderId)
      .select("name");

    const encryptedContent = encrypt(content);

    const message = new Message({
      chat: chatId,
      sender: senderId,
      senderModel,
      senderName: sender.name,
      content: encryptedContent,
    });

    await message.save();

    // Повертаємо розшифроване повідомлення для фронтенду
    res.status(201).json({
      ...message.toObject(),
      content,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка при надсиланні повідомлення", error });
  }
};

// Отримання всіх повідомлень з чату
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(userId)) {
      return res
        .status(403)
        .json({ message: "Чат не знайдено або доступ заборонено." });
    }

    const messages = await Message.find({ chat: chatId }).sort({
      createdAt: 1,
    });

    const decryptedMessages = messages.map((m) => {
      try {
        return {
          ...m.toObject(),
          content: decrypt(m.content),
        };
      } catch (err) {
        return {
          ...m.toObject(),
          content: m.content,
        };
      }
    });

    res.status(200).json(decryptedMessages);
  } catch (error) {
    console.error("Помилка при отриманні повідомлень:", error);
    res
      .status(500)
      .json({ message: "Помилка при отриманні повідомлень", error });
  }
};

// Отримання кількості непрочитаних повідомлень у всіх чатах
exports.getUnreadMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const chats = await Chat.find({ participants: userObjectId }).select("_id");
    const allowedChatIds = chats.map((chat) => chat._id);

    const unreadMessages = await Message.aggregate([
      {
        $match: {
          read: false,
          sender: { $ne: userObjectId },
          chat: { $in: allowedChatIds },
        },
      },
      {
        $group: {
          _id: "$chat",
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadCounts = unreadMessages.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json(unreadCounts);
  } catch (error) {
    console.error("Помилка при отриманні непрочитаних повідомлень:", error);
    res.status(500).json({
      message: "Помилка при отриманні непрочитаних повідомлень",
      error,
    });
  }
};

// Позначення повідомлень як прочитаних
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    await Message.updateMany(
      { chat: chatId, sender: { $ne: userId }, read: false },
      { $set: { read: true } }
    );

    res.json({ message: "Повідомлення позначено як прочитані." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка при оновленні статусу прочитаних", error });
  }
};
