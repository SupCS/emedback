const express = require("express");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();
const mongoose = require("mongoose");

// Отримання профілю лікаря
router.get("/doctor/:id", async (req, res) => {
    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid doctor ID." });
        }

        const doctor = await Doctor.findById(id).select("-password");

        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found." });
        }

        res.status(200).json({
            id: doctor._id,
            name: doctor.name,
            email: doctor.email,
            specialization: doctor.specialization,
            experience: doctor.experience,
            rating: doctor.rating,
            bio: doctor.bio,
            reviews: doctor.reviews,
            awards: doctor.awards,
            schedule: doctor.schedule,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong." });
    }
});

// Отримання профілю пацієнта
router.get(
    "/patient/:id",
    authenticate(["doctor", "patient"]),
    async (req, res) => {
        const { id } = req.params;

        try {
            // Перевірка, чи ID є валідним ObjectId
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: "Invalid patient ID." });
            }

            // Якщо запитувач — пацієнт, перевіряємо, чи це його профіль
            if (req.user.role === "patient" && req.user.id !== id) {
                return res.status(403).json({ message: "Access denied." });
            }

            const patient = await Patient.findById(id).select("-password");

            if (!patient) {
                return res.status(404).json({ message: "Patient not found." });
            }

            res.status(200).json({
                id: patient._id,
                name: patient.name,
                email: patient.email,
                phone: patient.phone,
                medicalRecords: patient.medicalRecords,
                prescriptions: patient.prescriptions,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Something went wrong." });
        }
    }
);

module.exports = router;
