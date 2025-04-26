const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const routes = require("./routes");
const swaggerDocs = require("./config/swagger");
const connectDB = require("./config/db");
const socket = require("./socket/index"); // Імпортуємо WebSocket
const path = require("path");
const cron = require("node-cron");
const updatePastAppointments = require("./scripts/updateAppointmentStatus");
const { rescheduleAllAppointments } = require("./utils/scheduler");
const { generalLimiter } = require("./middleware/rateLimiter");
connectDB();

const app = express();
const server = http.createServer(app); // Створюємо HTTP-сервер

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/", routes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(generalLimiter);

swaggerDocs(app);

// Запускаємо WebSocket після ініціалізації сервера
const io = socket.init(server);
app.set("io", io);

// Перевірка записів на завершення кожні 5 хвилин
cron.schedule("*/5 * * * *", () => {
  console.log("⏱️ Перевірка записів на завершення...");
  updatePastAppointments();
});

// Також виконуємо перевірку одразу при запуску сервера
updatePastAppointments();

// Переплановуємо всі підтверджені майбутні апоінтменти одразу після запуску
rescheduleAllAppointments(io);

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
