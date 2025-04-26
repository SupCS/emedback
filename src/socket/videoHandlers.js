const { roomSockets, socketToRoom, users } = require("./state");

module.exports = (socket, io) => {
  socket.on("join-room", ({ callId }) => {
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

  socket.on("leave-room", ({ callId }) => {
    socket.leave(callId);
    const participants = roomSockets.get(callId);
    if (participants) {
      participants.delete(socket.id);
      socketToRoom.delete(socket.id);
      socket.to(callId).emit("user-left", { socketId: socket.id });
      if (participants.size === 0) roomSockets.delete(callId);
    }
  });

  socket.on("offer", ({ callId, offer }) => {
    const participants = roomSockets.get(callId);
    const other = [...participants].find((id) => id !== socket.id);
    if (other) io.to(other).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ callId, answer }) => {
    const participants = roomSockets.get(callId);
    const other = [...participants].find((id) => id !== socket.id);
    if (other) io.to(other).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ callId, candidate }) => {
    const participants = roomSockets.get(callId);
    const other = [...participants].find((id) => id !== socket.id);
    if (other) io.to(other).emit("ice-candidate", { candidate });
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.user?.id} disconnected`);
    if (socket.user?.id) users.delete(socket.user.id);

    for (const [callId, sockets] of roomSockets.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        socketToRoom.delete(socket.id);
        socket.to(callId).emit("user-left", { socketId: socket.id });
        if (sockets.size === 0) {
          roomSockets.delete(callId);
        }
      }
    }
  });
};
