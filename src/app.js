const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");
const routes = require("./routes");
const swaggerDocs = require("./config/swagger");
const connectDB = require("./config/db");
const socket = require("./socket"); // Імпортуємо WebSocket

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app); // Створюємо HTTP-сервер

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/", routes);
swaggerDocs(app);

// Запускаємо WebSocket після ініціалізації сервера
const io = socket.init(server);
app.set("io", io);

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
