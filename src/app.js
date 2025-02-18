const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const routes = require("./routes");

dotenv.config(); // Завантаження змінних із .env

const app = express();
const PORT = process.env.PORT || 5000; // Порт за замовчуванням 5000

const connectDB = require("./config/db");
connectDB();

// Використовуємо CORS middleware
app.use(cors());

// Middleware для обробки JSON
app.use(express.json());

// Роутинг
app.use("/", routes);

// Запуск серверу
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
