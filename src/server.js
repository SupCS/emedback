const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const socket = require("./socket");
const { rescheduleAllAppointments } = require("./utils/scheduler");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);

    const io = socket.init(server);
    app.set("io", io);

    await rescheduleAllAppointments(io);

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error starting server:", error);
  }
};

startServer();
