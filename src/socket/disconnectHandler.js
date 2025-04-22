const { users, roomSockets, socketToRoom } = require("./state");

module.exports = (socket, io) => {
  socket.on("disconnect", () => {
    console.log(`🔴 User ${socket.user.id} disconnected`);

    const userSockets = users.get(socket.user.id);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) users.delete(socket.user.id);
    }

    const callId = socketToRoom.get(socket.id);
    if (callId) {
      const participants = roomSockets.get(callId);
      if (participants) {
        participants.delete(socket.id);
        socket.to(callId).emit("user-left", { socketId: socket.id });
        if (participants.size === 0) roomSockets.delete(callId);
      }
      socketToRoom.delete(socket.id);
    }
  });
};
