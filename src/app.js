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

// --- CORS ---
const allowedOrigins = ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Якщо немає origin (наприклад, запити від Postman) - дозволяємо
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy: Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Інші мідлвари
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

// --- Старт сервера ---
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
