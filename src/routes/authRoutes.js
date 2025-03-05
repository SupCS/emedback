const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Авторизація та аутентифікація
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Реєстрація нового пацієнта
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Іван Іванов
 *               email:
 *                 type: string
 *                 example: ivan.ivanov@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               phone:
 *                 type: string
 *                 example: "+380123456789"
 *     responses:
 *       201:
 *         description: Пацієнта успішно зареєстровано
 *       400:
 *         description: Email вже зареєстровано
 *       500:
 *         description: Виникла помилка на сервері
 */
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
      return res.status(400).json({ message: "Email is already registered." });
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

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Авторизація (логін) пацієнта або лікаря
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: ivan.ivanov@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Успішний вхід
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful.
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 role:
 *                   type: string
 *                   example: patient
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 60c72b2f9b1d4e34d8e2f9c9
 *                     name:
 *                       type: string
 *                       example: Іван Іванов
 *                     email:
 *                       type: string
 *                       example: ivan.ivanov@example.com
 *       401:
 *         description: Невірний email або пароль
 *       500:
 *         description: Виникла помилка на сервері
 */
// Ендпоїнт для логіну
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Шукаємо користувача серед пацієнтів і лікарів паралельно
    const [patient, doctor] = await Promise.all([
      Patient.findOne({ email }).select("+password"),
      Doctor.findOne({ email }).select("+password"),
    ]);

    // Визначаємо роль користувача
    const user = patient || doctor;
    const role = patient ? "patient" : doctor ? "doctor" : null;

    // Якщо користувача з таким email не знайдено
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Перевіряємо пароль
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Генеруємо JWT токен
    const token = jwt.sign(
      { id: user._id, role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
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
