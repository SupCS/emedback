const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const routes = require("./routes");
const cron = require("node-cron");
const DoctorSchedule = require("./models/DoctorSchedule");

cron.schedule("*/5 * * * *", async () => { // Запуск кожні 5 хвилин
    console.log("Cleaning up old slots...");

    const now = new Date();
    const formattedTime = now.toISOString().split("T")[1].slice(0, 5); // Формат HH:mm

    await DoctorSchedule.updateMany(
        {},
        { $pull: { "availability.$[].slots": { endTime: { $lt: formattedTime } } } }
    );

    // Видаляємо дні, які залишилися без слотів
    await DoctorSchedule.updateMany({}, { $pull: { availability: { slots: { $size: 0 } } } });

    console.log("Old slots removed.");
});


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
