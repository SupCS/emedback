const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { users } = require("./state");

module.exports = (socket, io) => {
  socket.on("sendMessage", async ({ chatId, content, recipientId }) => {
    const senderId = socket.user.id;
    const senderModel = socket.user.role === "doctor" ? "Doctor" : "Patient";

    if (!chatId || !content || !recipientId) return;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(senderId)) return;

    const message = await new Message({
      chat: chatId,
      sender: senderId,
      senderModel,
      senderName: socket.user.name,
      content,
    }).save();

    const recipientSockets = users.get(recipientId);
    if (recipientSockets) {
      for (const id of recipientSockets) {
        io.to(id).emit("receiveMessage", message);
      }
    }

    io.to(socket.id).emit("messageSent", message);
  });
};
