const express = require("express");
const Doctor = require("../models/Doctor");
const router = express.Router();

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
// Отримання списку всіх лікарів з фільтрацією
router.get("/", async (req, res) => {
  try {
    const { specialization, rating } = req.query;

    let baseFilter = {};

    if (specialization) {
      const specializations = specialization.split(",");
      baseFilter.specialization = { $in: specializations };
    }

    // Отримуємо ВСІХ лікарів за спеціалізацією
    const allDoctors = await Doctor.find(baseFilter)
      .select("name specialization rating ratingCount avatar")
      .sort({ rating: -1 }); // попереднє сортування для зручності

    if (rating) {
      const minRating = parseFloat(rating);

      const suitableDoctors = allDoctors.filter(
        (doc) => doc.rating !== null && doc.rating >= minRating
      );
      const otherDoctors = allDoctors.filter(
        (doc) => doc.rating === null || doc.rating < minRating
      );

      const sortedDoctors = [...suitableDoctors, ...otherDoctors];

      return res.status(200).json(sortedDoctors);
    }

    // Якщо фільтр за рейтингом не задано — просто повертаємо всіх
    res.status(200).json(allDoctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
});

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
// Отримання деталей лікаря
router.get("/details/:doctorId", async (req, res) => {
  const { doctorId } = req.params;

  try {
    const doctor = await Doctor.findById(doctorId).select(
      "name email specialization experience rating ratingCount bio avatar"
    );

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    res.status(200).json(doctor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
});

module.exports = router;
