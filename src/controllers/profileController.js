const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const { storage } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid"); // для генерації унікального імені файлу
const path = require("path");

// Отримання профілю лікаря
exports.getDoctorProfile = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Невалідний ID лікаря." });
    }

    const doctor = await Doctor.findById(id).select("-password");
    if (!doctor) {
      return res.status(404).json({ message: "Лікаря не знайдено." });
    }

    const isAdmin = req.user?.role === "admin";

    if (doctor.isBlocked && !isAdmin) {
      return res.status(403).json({ message: "Доступ заборонено." });
    }

    const passedAppointmentsCount = await Appointment.countDocuments({
      doctor: doctor._id,
      status: "passed",
    });

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
      passedAppointmentsCount,
    });
  } catch (error) {
    console.error("Помилка отримання профілю лікаря:", error);
    res.status(500).json({ message: "Помилка сервера." });
  }
};

// Отримання профілю пацієнта
exports.getPatientProfile = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Невалідний ID пацієнта." });
    }

    if (req.user.role === "patient" && req.user.id !== id) {
      return res.status(403).json({ message: "Доступ заборонено." });
    }

    const patient = await Patient.findById(id).select("-password");
    if (!patient) {
      return res.status(404).json({ message: "Пацієнта не знайдено." });
    }

    const isAdmin = req.user?.role === "admin";

    if (patient.isBlocked && !isAdmin) {
      return res.status(403).json({ message: "Доступ заборонено." });
    }

    res.status(200).json({
      id: patient._id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      avatar: patient.avatar || null,
      medicalRecords: patient.medicalRecords,
      prescriptions: patient.prescriptions || [],
      birthDate: patient.birthDate,
      height: patient.height,
      weight: patient.weight,
      bloodType: patient.bloodType,
      gender: patient.gender,
      allergies: patient.allergies,
      chronicDiseases: patient.chronicDiseases,
      passportNumber: patient.passportNumber,
      address: patient.address,
      workplace: patient.workplace,
    });
  } catch (error) {
    console.error("Помилка отримання профілю пацієнта:", error);
    res.status(500).json({ message: "Помилка сервера." });
  }
};

// Завантаження аватарки
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Файл не завантажено." });
    }

    const userId = req.user.id;
    const role = req.user.role;

    const userModel = role === "patient" ? Patient : Doctor;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Користувача не знайдено." });
    }

    // Генеруємо унікальне ім'я файлу
    const filename = `avatars/${uuidv4()}${
      req.file.originalname
        ? require("path").extname(req.file.originalname)
        : ".jpg"
    }`;
    const file = storage.file(filename);

    // Завантаження файлу у Firebase Storage
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
      storage.name
    }/o/${encodeURIComponent(filename)}?alt=media`;

    // Якщо є старий аватар — видаляємо
    if (user.avatar && user.avatar.includes(storage.name)) {
      const oldFilePath = user.avatar.split(`/${storage.name}/`)[1];
      if (oldFilePath) {
        await storage
          .file(oldFilePath)
          .delete()
          .catch((err) => {
            console.error("Не вдалося видалити старий аватар:", err.message);
          });
      }
    }

    // Оновлюємо профіль
    user.avatar = publicUrl;
    await user.save();

    res.status(200).json({ message: "Аватарку оновлено.", avatar: publicUrl });
  } catch (error) {
    console.error("Помилка при завантаженні аватарки:", error);
    res.status(500).json({ message: "Помилка при завантаженні файлу." });
  }
};

// // Відображення аватарки за шляхом
// exports.getAvatar = (req, res) => {
//   const requestedPath = req.params[0];
//   const filePath = path.join(__dirname, "../uploads", requestedPath);

//   if (fs.existsSync(filePath)) {
//     res.sendFile(filePath);
//   } else {
//     res.status(404).json({ message: "Файл не знайдено." });
//   }
// };

// Оновлення профілю лікаря або пацієнта
exports.updateProfile = async (req, res) => {
  const {
    name,
    phone,
    bio,
    birthDate,
    height,
    weight,
    bloodType,
    gender,
    allergies,
    chronicDiseases,
    passportNumber,
    address,
    workplace,
  } = req.body;
  const { id, role } = req.user;

  try {
    const Model = role === "doctor" ? Doctor : Patient;
    const user = await Model.findById(id);

    if (!user) {
      return res.status(404).json({ message: "Користувача не знайдено." });
    }

    if (role === "patient") {
      if (name !== undefined) {
        const trimmed = name.trim();
        if (
          typeof name !== "string" ||
          trimmed.length < 4 ||
          !/^[a-zA-Zа-яА-ЯёЁіІїЇєЄґҐ' ]+$/.test(trimmed)
        ) {
          return res.status(400).json({
            message: "Ім'я має містити щонайменше 4 символи та бути валідним.",
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

      if (birthDate !== undefined) {
        const date = new Date(birthDate);
        if (isNaN(date.getTime())) {
          return res
            .status(400)
            .json({ message: "Невалідна дата народження." });
        }
        user.birthDate = date;
      }

      if (height !== undefined) {
        const h = Number(height);
        if (isNaN(h) || h < 30 || h > 300) {
          return res
            .status(400)
            .json({ message: "Зріст має бути між 30 і 300 см." });
        }
        user.height = h;
      }

      if (weight !== undefined) {
        const w = Number(weight);
        if (isNaN(w) || w < 2 || w > 500) {
          return res
            .status(400)
            .json({ message: "Вага має бути між 2 і 500 кг." });
        }
        user.weight = w;
      }

      if (bloodType !== undefined) {
        const validBloodTypes = [
          "A+",
          "A-",
          "B+",
          "B-",
          "AB+",
          "AB-",
          "O+",
          "O-",
        ];
        if (!validBloodTypes.includes(bloodType)) {
          return res.status(400).json({ message: "Невірна група крові." });
        }
        user.bloodType = bloodType;
      }

      if (gender !== undefined) {
        const validGenders = ["male", "female", "other"];
        if (!validGenders.includes(gender)) {
          return res.status(400).json({ message: "Невірно вказана стать." });
        }
        user.gender = gender;
      }

      if (allergies !== undefined) {
        if (!Array.isArray(allergies)) {
          return res
            .status(400)
            .json({ message: "Алергії мають бути масивом." });
        }
        user.allergies = allergies.map((a) => String(a).trim()).filter(Boolean);
      }

      if (chronicDiseases !== undefined) {
        if (!Array.isArray(chronicDiseases)) {
          return res
            .status(400)
            .json({ message: "Діагнози мають бути масивом." });
        }
        user.chronicDiseases = chronicDiseases
          .map((d) => String(d).trim())
          .filter(Boolean);
      }

      if (passportNumber !== undefined) {
        if (
          typeof passportNumber !== "string" ||
          passportNumber.trim().length < 5
        ) {
          return res.status(400).json({
            message: "Номер паспорта має бути не коротшим за 5 символів.",
          });
        }
        user.passportNumber = passportNumber.trim();
      }

      if (address !== undefined) {
        if (typeof address !== "string" || address.trim().length < 5) {
          return res
            .status(400)
            .json({ message: "Адреса має бути не коротшою за 5 символів." });
        }
        user.address = address.trim();
      }

      if (workplace !== undefined) {
        if (typeof workplace !== "string" || workplace.trim().length < 3) {
          return res.status(400).json({
            message: "Місце роботи має бути не коротшим за 3 символи.",
          });
        }
        user.workplace = workplace.trim();
      }
    }

    if (role === "doctor") {
      if (bio !== undefined) {
        if (typeof bio !== "string") {
          return res.status(400).json({ message: "Біо має бути рядком." });
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

    await user.save();
    res.status(200).json({ message: "Профіль оновлено успішно." });
  } catch (error) {
    console.error("Помилка при оновленні профілю:", error);
    res.status(500).json({ message: "Помилка сервера при оновленні профілю." });
  }
};

// // Функція для видалення порожніх папок
// const deleteEmptyFolders = (folderPath) => {
//   try {
//     if (fs.existsSync(folderPath)) {
//       const files = fs.readdirSync(folderPath);
//       if (files.length === 0) {
//         fs.rmdirSync(folderPath);
//         const parentFolder = path.dirname(folderPath);
//         deleteEmptyFolders(parentFolder);
//       }
//     }
//   } catch (err) {
//     console.error("Помилка видалення порожньої папки:", err);
//   }
// };

// Завантаження PDF-документа до профілю користувача
exports.uploadDocument = async (req, res) => {
  try {
    const { title } = req.body;
    const file = req.file;

    if (!file || file.mimetype !== "application/pdf") {
      return res
        .status(400)
        .json({ message: "Необхідно завантажити PDF-файл." });
    }

    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Тайтл документа є обовʼязковим." });
    }

    const userId = req.user.id;
    const role = req.user.role;

    const userModel = role === "patient" ? Patient : Doctor;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Користувача не знайдено." });
    }

    const filename = `profile-documents/${uuidv4()}.pdf`;
    const firebaseFile = storage.file(filename);

    await firebaseFile.save(file.buffer, {
      metadata: { contentType: "application/pdf" },
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
      storage.name
    }/o/${encodeURIComponent(filename)}?alt=media`;

    const newDoc = {
      _id: new mongoose.Types.ObjectId(),
      title: title.trim(),
      url: publicUrl,
      storagePath: filename,
    };

    user.documents = [...(user.documents || []), newDoc];
    await user.save();

    res.status(200).json({
      message: "Документ успішно завантажено",
      document: {
        id: newDoc._id,
        title: newDoc.title,
        url: newDoc.url,
      },
    });
  } catch (error) {
    console.error("Помилка завантаження документа:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при завантаженні документа." });
  }
};

// Видалення документа з профілю користувача
exports.removeDocument = async (req, res) => {
  const docId = req.params.docId;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const userModel = role === "patient" ? Patient : Doctor;
    const user = await userModel.findById(userId);

    if (!user || !Array.isArray(user.documents)) {
      return res
        .status(404)
        .json({ message: "Користувача або документів не знайдено." });
    }

    const docIndex = user.documents.findIndex(
      (doc) => doc._id.toString() === docId
    );
    if (docIndex === -1) {
      return res.status(404).json({ message: "Документ не знайдено." });
    }

    const [removedDoc] = user.documents.splice(docIndex, 1);

    // Видалення з Firebase Storage
    if (removedDoc.storagePath) {
      await storage
        .file(removedDoc.storagePath)
        .delete()
        .catch((err) => {
          console.error("Не вдалося видалити файл з Firebase:", err.message);
        });
    }

    await user.save();

    res.status(200).json({ message: "Документ успішно видалено." });
  } catch (error) {
    console.error("Помилка видалення документа:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при видаленні документа." });
  }
};

exports.getDocuments = async (req, res) => {
  const requestedUserId = req.params.userId || req.user.id;

  try {
    let user = await Patient.findById(requestedUserId);

    if (!user) {
      user = await Doctor.findById(requestedUserId);
    }

    if (!user || !Array.isArray(user.documents)) {
      return res
        .status(404)
        .json({ message: "Користувача або документів не знайдено." });
    }

    const documents = user.documents.map((doc) => ({
      id: doc._id,
      title: doc.title,
      url: doc.url,
    }));

    res.status(200).json({ documents });
  } catch (error) {
    console.error("Помилка при отриманні документів:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при отриманні документів." });
  }
};
