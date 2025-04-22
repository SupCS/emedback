const users = new Map(); // userId → Set<socketId>
const roomSockets = new Map(); // callId → Set<socketId>
const socketToRoom = new Map(); // socketId → callId

module.exports = {
  users,
  roomSockets,
  socketToRoom,
};
