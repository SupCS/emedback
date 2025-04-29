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

// Підключення до бази даних
connectDB();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Налаштування CORS
const allowedOrigins = ["http://localhost:5173"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Спеціальна обробка preflight OPTIONS запитів
app.options("*", cors(corsOptions));

// --- Інші мідлвари ---
app.use(express.json());
app.use("/", routes);
app.use(generalLimiter);

// Swagger документація
swaggerDocs(app);

// Запускаємо WebSocket після ініціалізації сервера
const io = socket.init(server);
app.set("io", io);

// Переплановуємо всі майбутні апоінтменти
(async () => {
  await rescheduleAllAppointments(io);
})();

// Старт сервера
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
