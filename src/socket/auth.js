const jwt = require("jsonwebtoken");
const { users } = require("./state");

module.exports = (socket, next) => {
  let token = socket.handshake.auth?.token;

  if (!token && socket.handshake.headers.authorization) {
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) return next(new Error("No token provided"));

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Invalid token"));
    socket.user = decoded;

    if (!users.has(socket.user.id)) {
      users.set(socket.user.id, new Set());
    }
    users.get(socket.user.id).add(socket.id);

    console.log(`User authenticated: ${socket.user.id}`);
    next();
  });
};
