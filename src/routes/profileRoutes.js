const express = require("express");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const authenticate = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const router = express.Router();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

/**
 * @swagger
 * /profile/doctor/{id}:
 *   get:
 *     summary: Отримання профілю лікаря
 *     tags:
 *       - Profile
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID лікаря
 *         schema:
 *           type: string
 *           example: 609e1267b5a4a200157d8393
 *     responses:
 *       200:
 *         description: Профіль лікаря успішно отримано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
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
 *                 reviews:
 *                   type: array
 *                   items:
 *                     type: string
 *                 awards:
 *                   type: array
 *                   items:
 *                     type: string
 *                 schedule:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                       slots:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             startTime:
 *                               type: string
 *                             endTime:
 *                               type: string
 *       400:
 *         description: Invalid doctor ID
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Something went wrong
 */
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
      avatar: doctor.avatar || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
});

/**
 * @swagger
 * /profile/patient/{id}:
 *   get:
 *     summary: Отримання профілю пацієнта
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID пацієнта
 *         schema:
 *           type: string
 *           example: 609e1267b5a4a200157d8394
 *     responses:
 *       200:
 *         description: Профіль пацієнта успішно отримано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 medicalRecords:
 *                   type: array
 *                   items:
 *                     type: string
 *                 prescriptions:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Invalid patient ID
 *       403:
 *         description: Access denied
 *       404:
 *         description: Patient not found
 *       500:
 *         description: Something went wrong
 */
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
        avatar: patient.avatar || null,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Something went wrong." });
    }
  }
);

// Завантаження аватарки
router.post(
  "/upload-avatar",
  authenticate(["patient", "doctor"]),
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Файл не завантажено." });
      }

      const userId = req.user.id;
      const role = req.user.role;

      // Отримуємо шлях до файлу у форматі "uploads/..."
      const relativePath = path
        .relative(path.join(__dirname, "../"), req.file.path)
        .replace(/\\/g, "/");

      // Отримуємо шлях до старого аватара
      const userModel = role === "patient" ? Patient : Doctor;
      const user = await userModel.findById(userId);

      if (!user) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Помилка видалення нового файлу:", err);
        });
        return res.status(404).json({ message: "Користувача не знайдено." });
      }

      // Видаляємо попередній аватар (якщо є)
      if (user.avatar) {
        const oldAvatarPath = path.join(__dirname, "../", user.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlink(oldAvatarPath, (err) => {
            if (err) console.error("Помилка видалення старого файлу:", err);
            else {
              console.log(`Видалено старий аватар: ${oldAvatarPath}`);
              deleteEmptyFolders(path.dirname(oldAvatarPath)); // Перевіряємо та видаляємо порожні папки
            }
          });
        }
      }

      // Оновлюємо аватар у базі
      user.avatar = relativePath;
      await user.save();

      res.json({ message: "Аватарка оновлена!", avatar: relativePath });
    } catch (error) {
      console.error(error);

      // Якщо сталася помилка, видаляємо завантажений файл
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Помилка видалення нового файлу:", err);
        });
        deleteEmptyFolders(path.dirname(req.file.path));
      }

      res.status(500).json({ message: "Помилка завантаження файлу." });
    }
  }
);

// Отримання аватарки
router.get("/avatar/*", (req, res) => {
  const requestedPath = req.params[0];
  const filePath = path.join(__dirname, "../uploads", requestedPath);

  console.log("🔍 Requested avatar path:", requestedPath);
  console.log("📂 Resolved file path:", filePath);

  if (fs.existsSync(filePath)) {
    console.log("✅ File found, sending...");
    res.sendFile(filePath);
  } else {
    console.error("❌ File not found:", filePath);
    res.status(404).json({ message: "Файл не знайдено." });
  }
});

// Функція для видалення папки, якщо вона порожня
const deleteEmptyFolders = (folderPath) => {
  try {
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath);
      if (files.length === 0) {
        fs.rmdirSync(folderPath);
        console.log(`Видалено порожню папку: ${folderPath}`);

        // Перевіряємо та видаляємо батьківську папку, якщо вона також стала порожньою
        const parentFolder = path.dirname(folderPath);
        deleteEmptyFolders(parentFolder);
      }
    }
  } catch (err) {
    console.error("Помилка видалення порожньої папки:", err);
  }
};

/**
 * @swagger
 * /profile/update:
 *   patch:
 *     summary: Оновлення профілю користувача
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Профіль оновлено успішно
 *       400:
 *         description: Невалідні дані
 *       403:
 *         description: Доступ заборонено
 *       404:
 *         description: Користувача не знайдено
 *       500:
 *         description: Помилка сервера
 */
router.patch(
  "/update",
  authenticate(["doctor", "patient"]),
  async (req, res) => {
    const { name, phone, bio } = req.body;
    const { id, role } = req.user;

    try {
      const Model = role === "doctor" ? Doctor : Patient;
      const user = await Model.findById(id);

      if (!user) {
        return res.status(404).json({ message: "Користувача не знайдено." });
      }

      if (role === "patient") {
        // Пацієнт може змінювати тільки name і phone
        if (name !== undefined) {
          const trimmed = name.trim();
          if (
            typeof name !== "string" ||
            trimmed.length < 4 ||
            !/^[a-zA-Zа-яА-ЯёЁіІїЇєЄґҐ']+$/.test(trimmed)
          ) {
            return res.status(400).json({
              message: "Ім'я має складатись з 4 або більше",
            });
          }
          user.name = trimmed;
        }

        if (phone !== undefined) {
          if (!/^\+?[0-9]{10,15}$/.test(phone)) {
            return res
              .status(400)
              .json({ message: "Невалідний номер телефону." });
          }
          user.phone = phone.trim();
        }
      } else if (role === "doctor") {
        // Лікар може змінювати тільки bio і phone
        if (bio !== undefined) {
          if (typeof bio !== "string" || bio.trim().length < 10) {
            return res
              .status(400)
              .json({ message: "Невалідне біо. Мінімум 10 символів." });
          }
          user.bio = bio.trim();
        }

        if (phone !== undefined) {
          if (!/^\+?[0-9]{10,15}$/.test(phone)) {
            return res
              .status(400)
              .json({ message: "Невалідний номер телефону." });
          }
          user.phone = phone.trim();
        }
      }

      console.log("Перед збереженням:", user);
      await user.save();
      console.log("Після збереження:", user);

      res.json({ message: "Профіль оновлено успішно." });
    } catch (error) {
      console.error("Помилка при оновленні профілю:", error);
      res
        .status(500)
        .json({ message: "Помилка сервера при оновленні профілю." });
    }
  }
);

module.exports = router;
