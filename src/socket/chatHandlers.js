const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { users } = require("./state");

module.exports = (socket, io) => {
  socket.on("sendMessage", async ({ chatId, content, recipientId }) => {
    const senderId = socket.user.id;
    const senderModel = socket.user.role === "doctor" ? "Doctor" : "Patient";

    // Валідація вхідних параметрів
    if (!chatId || !content || !recipientId) {
      console.warn("⚠️ Надсилання повідомлення: відсутні обов'язкові поля.");
      return;
    }

    // Перевірка існування чату
    const chat = await Chat.findById(chatId);
    if (!chat) {
      console.warn(`⚠️ Чат із ID ${chatId} не знайдено.`);
      return;
    }

    // Перевірка, чи користувач є учасником чату
    if (!chat.participants.includes(senderId)) {
      console.warn(`❌ Користувач ${senderId} не є учасником чату ${chatId}.`);
      return;
    }

    // Створення нового повідомлення
    const message = await new Message({
      chat: chatId,
      sender: senderId,
      senderModel,
      senderName: socket.user.name,
      content,
    }).save();

    // 🔍 Логування повідомлення
    console.log("📨 Надіслано повідомлення:");
    console.log("    Від:", senderId);
    console.log("    Кому:", recipientId);
    console.log("    Контент:", content);
    console.log("    Відомі сокети цього користувача:", users.get(recipientId));
    console.log("    Всі userId в users Map:", [...users.keys()]);

    const recipientSockets = users.get(recipientId);

    if (recipientSockets && recipientSockets.size > 0) {
      for (const id of recipientSockets) {
        console.log(`    🔁 Відправляємо на сокет ${id}`);
        io.to(id).emit("receiveMessage", message);
      }
    } else {
      console.warn(
        "⚠️ Користувач не знайдений у users. Повідомлення не доставлено."
      );
    }

    // Відповідь відправнику
    io.to(socket.id).emit("messageSent", message);
  });
};
