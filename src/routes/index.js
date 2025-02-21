const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const profileRoutes = require("./profileRoutes");
const scheduleRoutes = require("./scheduleRoutes");
const doctorRoutes = require("./doctorRoutes");

// Тестовий ендпоїнт (головна сторінка)
router.get("/", (req, res) => {
    res.send("Hello World!");
});

// Маршрути для аутентифікації
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/schedule", scheduleRoutes);
router.use("/doctors", doctorRoutes);


module.exports = router;
