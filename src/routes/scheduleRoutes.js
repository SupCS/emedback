const express = require("express");
const DoctorSchedule = require("../models/DoctorSchedule");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();

// Функція для перевірки перетину слотів
const isOverlapping = (existingSlots, newSlot) => {
    const newStart = parseInt(newSlot.startTime.replace(":", ""), 10);
    const newEnd = parseInt(newSlot.endTime.replace(":", ""), 10);

    return existingSlots.some(slot => {
        const existingStart = parseInt(slot.startTime.replace(":", ""), 10);
        const existingEnd = parseInt(slot.endTime.replace(":", ""), 10);
        return (newStart < existingEnd && newEnd > existingStart); // Перетин слотів
    });
};

// Функція для перевірки допустимої тривалості слота (від 10 хв до 2 годин)
const isValidSlotDuration = (startTime, endTime) => {
    const start = parseInt(startTime.replace(":", ""), 10);
    const end = parseInt(endTime.replace(":", ""), 10);
    const duration = end - start;

    return duration >= 10 && duration <= 200;
};

// Функція для перевірки, що слот не створюється в минулому
const isFutureDate = (date, startTime) => {
    const now = new Date();
    const slotDateTime = new Date(date + "T" + startTime + ":00");

    return slotDateTime > now; // Дата і час повинні бути в майбутньому
};

// Додавання або оновлення слоту лікарем
// Додавання або оновлення слоту лікарем
router.post("/add", authenticate(["doctor"]), async (req, res) => {
    const { date, slots } = req.body;
    const doctorId = req.user.id; // Отримуємо ID лікаря з JWT

    if (!date || !slots || !Array.isArray(slots)) {
        return res.status(400).json({ message: "Invalid data format." });
    }

    for (let slot of slots) {
        if (!isValidSlotDuration(slot.startTime, slot.endTime)) {
            return res.status(400).json({
                message: `Slot ${slot.startTime} - ${slot.endTime} must be between 10 minutes and 2 hours.`,
            });
        }

        if (!isFutureDate(date, slot.startTime)) {
            return res.status(400).json({
                message: `Slot ${slot.startTime} on ${date} is in the past and cannot be created.`,
            });
        }
    }

    try {
        let schedule = await DoctorSchedule.findOne({ doctorId });

        if (!schedule) {
            schedule = new DoctorSchedule({ doctorId, availability: [{ date, slots }] });
        } else {
            let daySchedule = schedule.availability.find(d => d.date === date);

            if (!daySchedule) {
                schedule.availability.push({ date, slots });
            } else {
                for (let newSlot of slots) {
                    if (isOverlapping(daySchedule.slots, newSlot)) {
                        return res.status(400).json({
                            message: `Slot ${newSlot.startTime} - ${newSlot.endTime} overlaps with an existing slot on ${date}.`,
                        });
                    }
                }
                daySchedule.slots.push(...slots);
            }
        }

        await schedule.save();
        res.status(201).json({ message: "Schedule updated successfully", schedule });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong." });
    }
});

// Видалення слоту лікарем
router.delete("/remove-slot", authenticate(["doctor"]), async (req, res) => {
    const { date, startTime, endTime } = req.body;
    const doctorId = req.user.id; // Отримуємо ID лікаря з токена

    if (!date || !startTime || !endTime) {
        return res.status(400).json({ message: "Invalid data format." });
    }

    try {
        // Знайти розклад лікаря
        let schedule = await DoctorSchedule.findOne({ doctorId });

        if (!schedule) {
            return res.status(404).json({ message: "Schedule not found." });
        }

        // Знайти день у розкладі
        const daySchedule = schedule.availability.find(d => d.date === date);

        if (!daySchedule) {
            return res.status(404).json({ message: `No schedule found for ${date}.` });
        }

        // Видалити слот
        const updatedSlots = daySchedule.slots.filter(slot => !(slot.startTime === startTime && slot.endTime === endTime));

        if (updatedSlots.length === daySchedule.slots.length) {
            return res.status(404).json({ message: "Slot not found." });
        }

        // Якщо день залишився без слотів – видаляємо його
        if (updatedSlots.length === 0) {
            schedule.availability = schedule.availability.filter(d => d.date !== date);
        } else {
            daySchedule.slots = updatedSlots;
        }

        await schedule.save();
        res.status(200).json({ message: "Slot removed successfully", schedule });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong." });
    }
});

// Отримання графіка лікаря
router.get("/:doctorId", async (req, res) => {
    const { doctorId } = req.params;

    try {
        let schedule = await DoctorSchedule.findOne({ doctorId });

        if (!schedule) {
            return res.status(404).json({ message: "No schedule found for this doctor." });
        }

        // Видаляємо всі минулі слоти
        const now = new Date();
        schedule.availability = schedule.availability
            .map(day => ({
                date: day.date,
                slots: day.slots.filter(slot => new Date(day.date + "T" + slot.endTime + ":00") > now)
            }))
            .filter(day => day.slots.length > 0); // Видаляємо дні без слотів

        await schedule.save();
        res.status(200).json(schedule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong." });
    }
});

module.exports = router;

