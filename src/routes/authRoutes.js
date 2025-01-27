const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const router = express.Router();

// Ендпоїнт для реєстрації пацієнта
router.post("/register", async (req, res) => {
    const { name, email, password, phone } = req.body;

    try {
        // Перевіряємо email у двох колекціях паралельно
        const [existingPatient, existingDoctor] = await Promise.all([
            Patient.findOne({ email }),
            Doctor.findOne({ email }),
        ]);

        if (existingPatient || existingDoctor) {
            return res
                .status(400)
                .json({ message: "Email is already registered." });
        }

        // Хешуємо пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        // Створюємо нового пацієнта
        const newPatient = new Patient({
            name,
            email,
            password: hashedPassword,
            phone,
        });

        await newPatient.save();

        res.status(201).json({
            message: "Patient registered successfully.",
            patient: {
                id: newPatient._id,
                name: newPatient.name,
                email: newPatient.email,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Something went wrong. Please try again later.",
        });
    }
});

// Ендпоїнт для логіну
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Шукаємо користувача серед пацієнтів і лікарів паралельно
        const [patient, doctor] = await Promise.all([
            Patient.findOne({ email }),
            Doctor.findOne({ email }),
        ]);

        // Визначаємо роль користувача
        const user = patient || doctor;
        const role = patient ? "patient" : doctor ? "doctor" : null;

        // Якщо користувача з таким email не знайдено
        if (!user) {
            return res
                .status(401)
                .json({ message: "Invalid email or password." });
        }

        // Перевіряємо пароль
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res
                .status(401)
                .json({ message: "Invalid email or password." });
        }

        // Генеруємо JWT токен
        const token = jwt.sign(
            { id: user._id, role }, // Включаємо ID та роль у токен
            process.env.JWT_SECRET,
            { expiresIn: "1h" } // Термін дії токену
        );

        // Повертаємо відповідь
        res.status(200).json({
            message: "Login successful.",
            token,
            role,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Something went wrong. Please try again later.",
        });
    }
});

module.exports = router;
