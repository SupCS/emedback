const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const profileRoutes = require("./profileRoutes");

// Тестовий ендпоїнт (головна сторінка)
router.get("/", (req, res) => {
    res.send("Hello World!");
});

// Маршрути для аутентифікації
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);

module.exports = router;
