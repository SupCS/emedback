const socketIo = require("socket.io");
const authMiddleware = require("./auth");
const chatHandlers = require("./chatHandlers");
const videoHandlers = require("./videoHandlers");
const disconnectHandler = require("./disconnectHandler");
const appointmentHandlers = require("./appointmentHandlers");

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
      console.log(`Connected: ${socket.user.id}`);

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
