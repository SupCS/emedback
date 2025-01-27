const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes"); // Імпортуємо маршрути для аутентифікації

// Тестовий ендпоїнт (головна сторінка)
router.get("/", (req, res) => {
    res.send("Hello World!");
});

// Маршрути для аутентифікації
router.use("/auth", authRoutes);

module.exports = router;
