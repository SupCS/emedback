const express = require("express");
const router = express.Router();
const { registerPatient, loginUser } = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");

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
router.post("/register", authLimiter, registerPatient);

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
router.post("/login", authLimiter, loginUser);

module.exports = router;
