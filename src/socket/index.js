const socketIo = require("socket.io");
const authMiddleware = require("./auth");
const chatHandlers = require("./chatHandlers");
const videoHandlers = require("./videoHandlers");
const disconnectHandler = require("./disconnectHandler");
const appointmentHandlers = require("./appointmentHandlers");
const { users } = require("./state"); // 🔁 додано

let io;

module.exports = {
  init: (server) => {
    io = socketIo(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.use(authMiddleware);

    io.on("connection", (socket) => {
      const userId = socket.user.id;

      // ✅ Додаємо користувача в Map
      if (!users.has(userId)) {
        users.set(userId, new Set());
      }
      users.get(userId).add(socket.id);

      console.log(`🟢 Connected: ${userId}`);
      console.log(`📌 Socket ID: ${socket.id}`);
      console.log(`📦 Поточні сокети користувача ${userId}:`, [
        ...users.get(userId),
      ]);

      chatHandlers(socket, io);
      videoHandlers(socket, io);
      disconnectHandler(socket, io);
      appointmentHandlers(socket, io);
    });

    return io;
  },

  getIo: () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
  },
};
