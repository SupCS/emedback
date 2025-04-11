const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");

exports.createChat = async (req, res) => {
  try {
    const { userId, userType, recipientId, recipientType } = req.body;

    if (userType === "Patient" && recipientType === "Patient") {
      return res
        .status(400)
        .json({ message: "Patients cannot chat with other patients." });
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
    res.status(500).json({ message: "Error creating chat", error });
  }
};

exports.getChatsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const loggedInUserId = req.user.id;

    if (userId !== loggedInUserId) {
      return res.status(403).json({ message: "Access denied." });
    }

    const chats = await Chat.find({ participants: userId }).populate(
      "participants"
    );
    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: "Error fetching chats", error });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const senderId = req.user.id;
    const senderModel = req.user.role === "doctor" ? "Doctor" : "Patient";

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(400).json({ message: "Chat not found." });
    if (!chat.participants.includes(senderId)) {
      return res
        .status(403)
        .json({ message: "You are not a participant in this chat." });
    }

    if (!content || content.trim().length === 0) {
      return res
        .status(400)
        .json({ message: "Message content cannot be empty." });
    }
    if (content.length > 1000) {
      return res.status(400).json({ message: "Message is too long." });
    }

    const sender = await (senderModel === "Doctor" ? Doctor : Patient)
      .findById(senderId)
      .select("name");

    const message = new Message({
      chat: chatId,
      sender: senderId,
      senderModel,
      senderName: sender.name,
      content,
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Error sending message", error });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(400).json({ message: "Chat not found." });
    if (!chat.participants.includes(userId)) {
      return res
        .status(403)
        .json({ message: "You are not a participant in this chat." });
    }

    const messages = await Message.find({ chat: chatId }).sort({
      createdAt: 1,
    });
    res.status(200).json(messages);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching messages", error: error.message });
  }
};

exports.getUnreadMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const unreadMessages = await Message.aggregate([
      { $match: { read: false, sender: { $ne: userObjectId } } },
      { $group: { _id: "$chat", count: { $sum: 1 } } },
    ]);

    const unreadCounts = unreadMessages.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json(unreadCounts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching unread messages", error });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    await Message.updateMany(
      { chat: chatId, sender: { $ne: userId }, read: false },
      { $set: { read: true } }
    );

    res.json({ message: "Messages marked as read." });
  } catch (error) {
    res.status(500).json({ message: "Error marking messages as read", error });
  }
};
