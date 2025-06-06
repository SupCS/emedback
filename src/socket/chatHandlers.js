const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { encrypt } = require("../utils/encryption");
const { users } = require("./state");

module.exports = (socket, io) => {
  socket.on("sendMessage", async ({ chatId, content, recipientId }) => {
    const senderId = socket.user.id;
    const senderModel = socket.user.role === "doctor" ? "Doctor" : "Patient";

    if (!chatId || !content || !recipientId) {
      console.warn("Надсилання повідомлення: відсутні обов'язкові поля.");
      return;
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      console.warn(`Чат із ID ${chatId} не знайдено.`);
      return;
    }

    if (!chat.participants.includes(senderId)) {
      console.warn(`Користувач ${senderId} не є учасником чату ${chatId}.`);
      return;
    }

    const encryptedContent = encrypt(content);

    const message = await new Message({
      chat: chatId,
      sender: senderId,
      senderModel,
      senderName: socket.user.name,
      content: encryptedContent,
    }).save();

    const recipientSockets = users.get(recipientId);

    if (recipientSockets && recipientSockets.size > 0) {
      for (const id of recipientSockets) {
        io.to(id).emit("receiveMessage", {
          ...message.toObject(),
          content,
        });
      }
    } else {
      console.warn(
        "Користувач не знайдений у users. Повідомлення не доставлено."
      );
    }

    io.to(socket.id).emit("messageSent", {
      ...message.toObject(),
      content,
    });
  });
};
