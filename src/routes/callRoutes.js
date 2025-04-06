const express = require("express");
const { db } = require("../config/firebase");
const Appointment = require("../models/Appointment");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route GET /calls/:callId
 * @desc Перевірка доступу до WebRTC кімнати
 * @access Private (doctor/patient)
 */
router.get(
  "/:callId",
  authenticate(["doctor", "patient"]),
  async (req, res) => {
    const { callId } = req.params;
    const userId = req.user.id;

    try {
      const callDoc = await db.collection("calls").doc(callId).get();

      if (!callDoc.exists) {
        return res.status(404).json({ message: "Кімната не знайдена." });
      }

      const { appointmentId } = callDoc.data();

      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Прийом не знайдено." });
      }

      const isDoctor = appointment.doctor.toString() === userId;
      const isPatient = appointment.patient.toString() === userId;

      if (!isDoctor && !isPatient) {
        return res.status(403).json({ message: "Доступ заборонено." });
      }

      const role = isDoctor ? "doctor" : "patient";

      return res.json({
        message: "Доступ дозволено.",
        appointmentId,
        role,
      });
    } catch (error) {
      console.error("❌ Помилка при перевірці доступу до кімнати:", error);
      res.status(500).json({ message: "Помилка сервера." });
    }
  }
);

module.exports = router;
