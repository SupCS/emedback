const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const Chat = require("./models/Chat");
const Message = require("./models/Message");
const Doctor = require("./models/Doctor");
const Patient = require("./models/Patient");

let io;

module.exports = {
  init: (server) => {
    io = socketIo(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Authorization"],
        credentials: true,
      },
    });

    io.use((socket, next) => {
      let token = socket.handshake.auth?.token;

      // Якщо токена немає в auth, пробуємо отримати його з заголовка Authorization
      if (!token && socket.handshake.headers.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.split(" ")[1]; // Видаляємо "Bearer "
        }
      }

      if (!token) {
        console.log("🔴 No token provided");
        return next(new Error("No token provided"));
      }

      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          console.log("🔴 Invalid token");
          return next(new Error("Invalid token"));
        }

        socket.user = decoded;
        console.log(`🟢 User authenticated: ${socket.user.id}`);
        next();
      });
    });

    io.on("connection", (socket) => {
      console.log(
        `🟢 User ${socket.user.id} connected, socket ID: ${socket.id}`
      );

      socket.onAny((event, ...args) => {
        console.log(`📩 Received event: ${event}`, args);
      });

      socket.on("joinChat", async (data) => {
        console.log("joinChat received:", data);

        if (!data || !data.chatId) {
          console.log("🔴 Error: No chatId provided!");
          return;
        }

        const chatId = data.chatId;

        try {
          const chat = await Chat.findById(chatId);
          if (!chat) {
            console.log("🔴 Error: Chat not found.");
            return;
          }

          if (!chat.participants.includes(socket.user.id)) {
            console.log("🔴 Error: User is not a participant of this chat.");
            return;
          }

          socket.join(chatId);
          console.log(`🟢 User ${socket.user.id} joined chat: ${chatId}`);

          setTimeout(() => {
            console.log("📌 All rooms:", io.of("/").adapter.rooms);
            console.log(
              `📌 Current users in chat ${chatId}:`,
              io.of("/").adapter.rooms.get(chatId)
            );
          }, 1000);
        } catch (error) {
          console.log("🔴 Error joining chat:", error);
        }
      });

      socket.on("sendMessage", async (messageData) => {
        console.log(`🔵 sendMessage received:`, messageData);

        if (!socket.user) {
          console.log("🔴 Error: User is not authenticated!");
          return;
        }

        const { chatId, content } = messageData;
        const senderId = socket.user.id;
        const senderModel =
          socket.user.role === "doctor" ? "Doctor" : "Patient";

        if (!chatId || !content) {
          console.log("🔴 Error: Invalid message data", messageData);
          return;
        }

        try {
          const chat = await Chat.findById(chatId);
          if (!chat) {
            console.log("🔴 Error: Chat not found.");
            return;
          }

          if (!chat.participants.includes(senderId)) {
            console.log("🔴 Error: User is not a participant of this chat.");
            return;
          }

          const message = new Message({
            chat: chatId,
            sender: senderId,
            senderModel,
            senderName: socket.user.name,
            content,
          });

          await message.save();

          console.log(`🟢 Emitting receiveMessage to chat ${chatId}`, message);
          io.to(chatId).emit("receiveMessage", message);
        } catch (error) {
          console.log("🔴 Error sending message:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log(`🔴 User ${socket.user.id} disconnected`);
      });
    });

    return io;
  },

  getIo: () => {
    if (!io) {
      throw new Error("Socket.io is not initialized!");
    }
    return io;
  },
};
