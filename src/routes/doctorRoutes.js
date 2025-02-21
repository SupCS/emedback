const express = require("express");
const Doctor = require("../models/Doctor");
const router = express.Router();

// Отримання списку всіх лікарів з фільтрацією
router.get("/", async (req, res) => {
    try {
        const { specialization, rating } = req.query;

        // Створюємо об'єкт для фільтрації
        let filter = {};

        // Якщо передано кілька спеціалізацій (через кому) – фільтруємо за ними
        if (specialization) {
            const specializations = specialization.split(","); // Розділяємо по комі
            filter.specialization = { $in: specializations };
        }

        // Фільтрація за рейтингом (>= заданому)
        if (rating) {
            filter.rating = { $gte: parseFloat(rating) };
        }

        // Отримуємо список лікарів за фільтром
        const doctors = await Doctor.find(filter)
            .select("-password") // Прибираємо поле пароля
            .sort({ rating: -1 }); // Сортуємо за рейтингом за спаданням

        res.status(200).json(doctors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong." });
    }
});

module.exports = router;
