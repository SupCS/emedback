const express = require("express");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const DoctorSchedule = require("../models/DoctorSchedule");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();

// Створення запису (appointment)
router.post("/create", authenticate(["patient"]), async (req, res) => {
    const { doctorId, date, startTime, endTime } = req.body;
    const patientId = req.user.id;

    try {
        // Перевіряємо, чи існує лікар
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found." });
        }

        // Отримуємо графік лікаря
        const doctorSchedule = await DoctorSchedule.findOne({
            doctorId: doctorId,
            "availability.date": date
        });

        if (!doctorSchedule) {
            return res.status(400).json({ message: "No available slots on this date." });
        }

        // Перевіряємо, чи існує обраний слот
        const dayAvailability = doctorSchedule.availability.find(day => day.date === date);

        const isSlotAvailable = dayAvailability.slots.some(
            slot => slot.startTime === startTime && slot.endTime === endTime
        );

        if (!isSlotAvailable) {
            return res.status(400).json({ message: "Selected time slot is not available." });
        }

        // Перевіряємо, чи слот вже зайнятий
        const existingAppointment = await Appointment.findOne({
            doctor: doctorId,
            date,
            startTime,
            endTime,
            status: "confirmed"
        });

        if (existingAppointment) {
            return res.status(400).json({ message: "Time slot already booked." });
        }

        // Створюємо новий запис
        const newAppointment = new Appointment({
            doctor: doctorId,
            patient: patientId,
            date,
            startTime,
            endTime
        });

        await newAppointment.save();

        // Видаляємо обраний тайм-слот зі списку доступних у графіку лікаря
        const updatedAvailability = doctorSchedule.availability.map(day => {
            if (day.date === date) {
                const filteredSlots = day.slots.filter(
                    slot => !(slot.startTime === startTime && slot.endTime === endTime)
                );

                // Якщо день залишився без слотів — видаляємо його
                if (filteredSlots.length === 0) {
                    return null;
                }

                return {
                    date: day.date,
                    slots: filteredSlots
                };
            }
            return day;
        }).filter(day => day !== null); // Фільтруємо null значення

        doctorSchedule.availability = updatedAvailability;
        await doctorSchedule.save();

        res.status(201).json({
            message: "Appointment created successfully.",
            appointment: newAppointment
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong." });
    }
});

// Отримання всіх записів лікаря
router.get("/doctor/:doctorId", authenticate(["doctor"]), async (req, res) => {
    const { doctorId } = req.params;

    // Перевірка: лікар може бачити тільки свої записи
    if (req.user.role === "doctor" && req.user.id !== doctorId) {
        return res.status(403).json({ message: "Access denied." });
    }

    try {
        const appointments = await Appointment.find({ doctor: doctorId })
            .populate("patient", "name email phone")
            .sort({ date: 1, startTime: 1 });

        res.status(200).json(appointments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong." });
    }
});

// Отримання всіх записів пацієнта
router.get("/patient/:patientId", authenticate(["patient"]), async (req, res) => {
    const { patientId } = req.params;

    // Перевірка: пацієнт може бачити тільки свої записи
    if (req.user.role === "patient" && req.user.id !== patientId) {
        return res.status(403).json({ message: "Access denied." });
    }

    try {
        const appointments = await Appointment.find({ patient: patientId })
            .populate("doctor", "name specialization")
            .sort({ date: 1, startTime: 1 });

        res.status(200).json(appointments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong." });
    }
});

module.exports = router;

