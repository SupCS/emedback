const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const Chat = require("./models/Chat");
const Message = require("./models/Message");

let io;
const users = new Map(); // userId → Set<socketId>
const roomSockets = new Map(); // callId → Set<socketId>
const socketToRoom = new Map(); // socketId → callId

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

        if (!users.has(socket.user.id)) {
          users.set(socket.user.id, new Set());
        }
        users.get(socket.user.id).add(socket.id);

        console.log(`🟢 User authenticated: ${socket.user.id}`);
        next();
      });
    });

    io.on("connection", (socket) => {
      console.log(`🟢 User ${socket.user.id} connected`);

      // ------------------ ЧАТ ------------------
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
          if (!chat) return;

          if (!chat.participants.includes(senderId)) return;

          const message = new Message({
            chat: chatId,
            sender: senderId,
            senderModel,
            senderName: socket.user.name,
            content,
          });

          await message.save();

          const recipientSockets = users.get(recipientId);
          if (recipientSockets) {
            for (const sockId of recipientSockets) {
              io.to(sockId).emit("receiveMessage", message);
            }
          }

          io.to(socket.id).emit("messageSent", message);
        } catch (error) {
          console.log("🔴 Error sending message:", error);
        }
      });

      // ------------------ ВІДЕОДЗВІНОК ------------------

      socket.on("join-room", ({ callId }) => {
        console.log(`📞 ${socket.user.id} приєднався до кімнати ${callId}`);
        socket.join(callId);
        socketToRoom.set(socket.id, callId);

        if (!roomSockets.has(callId)) {
          roomSockets.set(callId, new Set());
        }
        const participants = roomSockets.get(callId);
        participants.add(socket.id);

        const otherSocketId = Array.from(participants).find(
          (id) => id !== socket.id
        );
        if (otherSocketId) {
          socket.emit("user-joined", { socketId: otherSocketId });
        }
      });

      socket.on("offer", ({ callId, offer }) => {
        const participants = roomSockets.get(callId);
        if (!participants) return;

        const otherSocketId = Array.from(participants).find(
          (id) => id !== socket.id
        );
        if (otherSocketId) {
          io.to(otherSocketId).emit("offer", { offer, from: socket.id });
        }
      });

      socket.on("answer", ({ callId, answer }) => {
        const participants = roomSockets.get(callId);
        if (!participants) return;

        const otherSocketId = Array.from(participants).find(
          (id) => id !== socket.id
        );
        if (otherSocketId) {
          io.to(otherSocketId).emit("answer", { answer });
        }
      });

      socket.on("ice-candidate", ({ callId, candidate }) => {
        const participants = roomSockets.get(callId);
        if (!participants) return;

        const otherSocketId = Array.from(participants).find(
          (id) => id !== socket.id
        );
        if (otherSocketId) {
          io.to(otherSocketId).emit("ice-candidate", { candidate });
        }
      });

      socket.on("leave-room", ({ callId }) => {
        console.log(`🚪 ${socket.user.id} покинув кімнату ${callId}`);
        socket.leave(callId);

        const participants = roomSockets.get(callId);
        if (participants) {
          participants.delete(socket.id);
          socketToRoom.delete(socket.id);
          socket.to(callId).emit("user-left", { socketId: socket.id });

          if (participants.size === 0) {
            roomSockets.delete(callId);
          }
        }
      });

      // ------------------ ВИХІД ------------------

      socket.on("disconnect", () => {
        console.log(`🔴 User ${socket.user.id} disconnected`);

        const userSockets = users.get(socket.user.id);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            users.delete(socket.user.id);
          }
        }

        const callId = socketToRoom.get(socket.id);
        if (callId) {
          const participants = roomSockets.get(callId);
          if (participants) {
            participants.delete(socket.id);
            socket.to(callId).emit("user-left", { socketId: socket.id });

            if (participants.size === 0) {
              roomSockets.delete(callId);
            }
          }
          socketToRoom.delete(socket.id);
        }
      });
    });

    return io;
  },

  getIo: () => {
    if (!io) throw new Error("Socket.io is not initialized!");
    return io;
  },

  getIoUsers: () => users,
};
