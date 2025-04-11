const express = require("express");
const router = express.Router();
const {
  getFilteredDoctors,
  getDoctorDetails,
} = require("../controllers/doctorController");

/**
 * @swagger
 * /doctors:
 *   get:
 *     summary: Отримання списку всіх лікарів з фільтрацією
 *     tags:
 *       - Doctors
 *     parameters:
 *       - name: specialization
 *         in: query
 *         required: false
 *         description: Фільтрація за спеціалізацією (можна вказати кілька через кому)
 *         schema:
 *           type: string
 *           example: Психіатр,Лор
 *       - name: rating
 *         in: query
 *         required: false
 *         description: Фільтрація за рейтингом (>= заданому)
 *         schema:
 *           type: number
 *           example: 4.0
 *     responses:
 *       200:
 *         description: Список лікарів успішно отримано
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   specialization:
 *                     type: string
 *                   rating:
 *                     type: number
 *       500:
 *         description: Something went wrong
 */
router.get("/", getFilteredDoctors);

/**
 * @swagger
 * /doctors/details/{doctorId}:
 *   get:
 *     summary: Отримання деталей лікаря
 *     tags:
 *       - Doctors
 *     parameters:
 *       - name: doctorId
 *         in: path
 *         required: true
 *         description: ID лікаря
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Деталі лікаря успішно отримано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 specialization:
 *                   type: string
 *                 experience:
 *                   type: number
 *                 rating:
 *                   type: number
 *                 bio:
 *                   type: string
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Something went wrong
 */
router.get("/details/:doctorId", getDoctorDetails);

module.exports = router;
