const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const Chat = require("./models/Chat");
const Message = require("./models/Message");

let io;
const users = new Map(); // userId → socketId

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

      if (!token && socket.handshake.headers.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.split(" ")[1];
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
        users.set(socket.user.id, socket.id);
        console.log(`🟢 User authenticated: ${socket.user.id}`);
        next();
      });
    });

    io.on("connection", (socket) => {
      console.log(`🟢 User ${socket.user.id} connected`);

      socket.on("sendMessage", async (messageData) => {
        const { chatId, content, recipientId } = messageData;
        const senderId = socket.user.id;
        const senderModel =
          socket.user.role === "doctor" ? "Doctor" : "Patient";

        if (!chatId || !content || !recipientId) {
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

          console.log(`🟢 Message sent to ${recipientId}`);

          const recipientSocketId = users.get(recipientId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit("receiveMessage", message);
          }

          io.to(socket.id).emit("messageSent", message);
        } catch (error) {
          console.log("🔴 Error sending message:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log(`🔴 User ${socket.user.id} disconnected`);
        users.delete(socket.user.id);
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
  getIoUsers: () => users,
};
