const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const routes = require("./routes");
const swaggerDocs = require("./config/swagger");
const connectDB = require("./config/db");
const socket = require("./socket/index");
const { rescheduleAllAppointments } = require("./utils/scheduler");
const { generalLimiter } = require("./middleware/rateLimiter");

connectDB();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/", routes);
app.use(generalLimiter);

swaggerDocs(app);

// Запускаємо WebSocket після ініціалізації сервера
const io = socket.init(server);
app.set("io", io);

// Переплановуємо майбутні апоінтменти
(async () => {
  await rescheduleAllAppointments(io);
})();

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
