const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const profileRoutes = require("./profileRoutes");
const scheduleRoutes = require("./scheduleRoutes");
const doctorRoutes = require("./doctorRoutes");
const appointmentRoutes = require("./appointmentRoutes");
const chatRoutes = require("./chatRoutes");
const prescriptionRoutes = require("./prescriptionRoutes");
const callRoutes = require("./callRoutes");
const ratingRoutes = require("./ratingRoutes");
const aiRoutes = require("./aiRoutes");
const adminRoutes = require("./adminRoutes");

// Маршрути для аутентифікації
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/schedule", scheduleRoutes);
router.use("/doctors", doctorRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/chat", chatRoutes);
router.use("/prescriptions", prescriptionRoutes);
router.use("/calls", callRoutes);
router.use("/ratings", ratingRoutes);
router.use("/ai", aiRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
