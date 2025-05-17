const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Admin = require("../models/Admin");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const Prescription = require("../models/Prescription");
const DoctorSchedule = require("../models/DoctorSchedule");
const { getStorage } = require("firebase-admin/storage");

// POST /admin/login
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return res.status(401).json({ message: "Невірний email або пароль." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Невірний email або пароль." });
    }

    const token = jwt.sign(
      { id: admin._id, role: "admin", name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.status(200).json({
      message: "Успішний вхід в адмінку.",
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Помилка входу адміністратора:", error);
    res.status(500).json({ message: "Помилка сервера під час входу." });
  }
};

// GET /admin/profile
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: "Адміністратора не знайдено." });
    }

    res.json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      createdAt: admin.createdAt,
    });
  } catch (error) {
    console.error("Помилка отримання профілю адміністратора:", error);
    res.status(500).json({ message: "Помилка сервера при отриманні профілю." });
  }
};

// GET /admin/doctors
exports.getAllDoctors = async (req, res) => {
  try {
    const {
      search,
      isBlocked,
      specialization,
      minExperience,
      maxExperience,
      minRating,
      maxRating,
    } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }
    if (isBlocked !== undefined) {
      filter.isBlocked = isBlocked === "true";
    }
    if (specialization) {
      filter.specialization = specialization;
    }
    if (minExperience !== undefined || maxExperience !== undefined) {
      filter.experience = {};
      if (minExperience !== undefined) {
        filter.experience.$gte = Number(minExperience);
      }
      if (maxExperience !== undefined) {
        filter.experience.$lte = Number(maxExperience);
      }
    }
    if (minRating !== undefined || maxRating !== undefined) {
      filter.rating = {};
      if (minRating !== undefined) {
        filter.rating.$gte = Number(minRating);
      }
      if (maxRating !== undefined) {
        filter.rating.$lte = Number(maxRating);
      }
    }

    const doctors = await Doctor.find(filter).select("-password");
    res.json(doctors);
  } catch (error) {
    console.error("Помилка отримання лікарів:", error);
    res.status(500).json({ message: "Помилка сервера при отриманні лікарів." });
  }
};

// GET /admin/patients
exports.getAllPatients = async (req, res) => {
  try {
    const { search, isBlocked, gender, minAge, maxAge, bloodType } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }
    if (isBlocked !== undefined) {
      filter.isBlocked = isBlocked === "true";
    }
    if (gender) {
      filter.gender = gender;
    }
    if (bloodType) {
      filter.bloodType = bloodType;
    }
    if (minAge || maxAge) {
      const today = new Date();
      filter.birthDate = {};
      if (minAge) {
        const maxBirthDate = new Date(today);
        maxBirthDate.setFullYear(today.getFullYear() - Number(minAge));
        filter.birthDate.$lte = maxBirthDate;
      }
      if (maxAge) {
        const minBirthDate = new Date(today);
        minBirthDate.setFullYear(today.getFullYear() - Number(maxAge));
        filter.birthDate.$gte = minBirthDate;
      }
    }

    const patients = await Patient.find(filter).select("-password");
    res.json(patients);
  } catch (error) {
    console.error("Помилка отримання пацієнтів:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при отриманні пацієнтів." });
  }
};

// GET /admin/appointments
exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("doctor", "name email")
      .populate("patient", "name email");

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Помилка отримання списку записів:", error);
    res.status(500).json({ message: "Помилка сервера при отриманні записів." });
  }
};

// GET /admin/prescriptions
exports.getAllPrescriptions = async (req, res) => {
  try {
    const { doctor, patient, from, to } = req.query;

    const filter = {};

    if (doctor) {
      if (!mongoose.Types.ObjectId.isValid(doctor)) {
        return res.status(400).json({ message: "Невалідний ID лікаря." });
      }
      filter.doctor = doctor;
    }

    if (patient) {
      if (!mongoose.Types.ObjectId.isValid(patient)) {
        return res.status(400).json({ message: "Невалідний ID пацієнта." });
      }
      filter.patient = patient;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        filter.createdAt.$gte = new Date(from);
      }
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const prescriptions = await Prescription.find(filter)
      .populate("doctor", "name email specialization")
      .populate("patient", "name email");

    res.status(200).json(prescriptions);
  } catch (error) {
    console.error("Помилка отримання призначень:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при отриманні призначень." });
  }
};

// PATCH /admin/prescriptions/:id
exports.toggleArchivePrescription = async (req, res) => {
  const { id } = req.params;
  const { isArchived } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Невалідний ID призначення." });
  }

  if (typeof isArchived !== "boolean") {
    return res
      .status(400)
      .json({ message: "Поле isArchived має бути true або false." });
  }

  try {
    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ message: "Призначення не знайдено." });
    }

    prescription.isArchived = isArchived;
    await prescription.save();

    res.status(200).json({
      message: isArchived
        ? "Призначення архівовано."
        : "Призначення розархівовано.",
    });
  } catch (error) {
    console.error("Помилка оновлення архівації:", error);
    res.status(500).json({ message: "Помилка сервера при зміні архівації." });
  }
};

// POST /admin/doctors
exports.addDoctor = async (req, res) => {
  const { name, email, password, phone, specialization, experience, bio } =
    req.body;

  try {
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res
        .status(400)
        .json({ message: "Електронна адреса вже використовується." });
    }

    const hashedPassword = await bcrypt.hash(password || "password123", 10);

    const newDoctor = new Doctor({
      name,
      email,
      password: hashedPassword,
      phone,
      specialization,
      experience,
      bio,
      avatar: null,
    });

    await newDoctor.save();

    res
      .status(201)
      .json({ message: "Лікаря успішно створено.", doctor: newDoctor });
  } catch (error) {
    console.error("Помилка при створенні лікаря:", error);
    res.status(500).json({ message: "Помилка сервера при створенні лікаря." });
  }
};

// DELETE /admin/doctors/:id
exports.deleteDoctor = async (req, res) => {
  const doctorId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({ message: "Невалідний ID лікаря." });
  }

  try {
    const doctor = await Doctor.findByIdAndDelete(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Лікаря не знайдено." });
    }

    // Видаляємо графік лікаря
    await DoctorSchedule.deleteOne({ doctorId });

    // Видаляємо всі записи лікаря
    await Appointment.deleteMany({ doctor: doctorId });

    res
      .status(200)
      .json({ message: "Лікаря та пов'язані дані успішно видалено." });
  } catch (error) {
    console.error("Помилка при видаленні лікаря:", error);
    res.status(500).json({ message: "Помилка сервера при видаленні лікаря." });
  }
};

// PATCH /admin/doctors/:id/block
exports.blockDoctor = async (req, res) => {
  const doctorId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({ message: "Невалідний ID лікаря." });
  }

  try {
    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      { isBlocked: true },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: "Лікаря не знайдено." });
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 5);

    // Очищаємо майбутні слоти лікаря
    const schedule = await DoctorSchedule.findOne({ doctorId });
    if (schedule) {
      schedule.availability = schedule.availability
        .map((day) => {
          const futureSlots = day.slots.filter(
            (slot) => new Date(`${day.date}T${slot.endTime}:00`) <= now
          );
          return futureSlots.length > 0
            ? { date: day.date, slots: futureSlots }
            : null;
        })
        .filter(Boolean);

      await schedule.save();
    }

    // Скасовуємо всі майбутні записи
    await Appointment.updateMany(
      {
        doctor: doctorId,
        status: { $in: ["pending", "confirmed"] },
        $or: [
          { date: { $gt: today } },
          { date: today, endTime: { $gt: currentTime } },
        ],
      },
      { $set: { status: "cancelled" } }
    );

    res.status(200).json({
      message: "Лікаря заблоковано, слоти очищено, записи скасовано.",
      doctor,
    });
  } catch (error) {
    console.error("Помилка при блокуванні лікаря:", error);
    res.status(500).json({ message: "Помилка сервера при блокуванні лікаря." });
  }
};

// PATCH /admin/doctors/:id/unblock
exports.unblockDoctor = async (req, res) => {
  const doctorId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({ message: "Невалідний ID лікаря." });
  }

  try {
    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      { isBlocked: false },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: "Лікаря не знайдено." });
    }

    res.status(200).json({ message: "Лікаря успішно розблоковано.", doctor });
  } catch (error) {
    console.error("Помилка при розблокуванні лікаря:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при розблокуванні лікаря." });
  }
};

// PATCH /admin/patients/:id/block
exports.blockPatient = async (req, res) => {
  const patientId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    return res.status(400).json({ message: "Невалідний ID пацієнта." });
  }

  try {
    const patient = await Patient.findByIdAndUpdate(
      patientId,
      { isBlocked: true },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({ message: "Пацієнта не знайдено." });
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 5);

    await Appointment.updateMany(
      {
        patient: patientId,
        status: { $in: ["pending", "confirmed"] },
        $or: [
          { date: { $gt: today } },
          { date: today, endTime: { $gt: currentTime } },
        ],
      },
      { $set: { status: "cancelled" } }
    );

    res.status(200).json({
      message: "Пацієнта заблоковано та записи скасовано.",
      patient,
    });
  } catch (error) {
    console.error("Помилка при блокуванні пацієнта:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при блокуванні пацієнта." });
  }
};

// PATCH /admin/patients/:id/unblock
exports.unblockPatient = async (req, res) => {
  const patientId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    return res.status(400).json({ message: "Невалідний ID пацієнта." });
  }

  try {
    const patient = await Patient.findByIdAndUpdate(
      patientId,
      { isBlocked: false },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({ message: "Пацієнта не знайдено." });
    }

    res
      .status(200)
      .json({ message: "Пацієнта успішно розблоковано.", patient });
  } catch (error) {
    console.error("Помилка при розблокуванні пацієнта:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при розблокуванні пацієнта." });
  }
};

// PATCH /admin/doctors/:id
exports.adminUpdateDoctor = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Невалідний ID лікаря." });
  }

  try {
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: "Лікаря не знайдено." });
    }

    const allowedFields = [
      "name",
      "email",
      "phone",
      "bio",
      "specialization",
      "experience",
      "avatar",
      "rating",
      "ratingCount",
      "isBlocked",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        doctor[field] = updates[field];
      }
    });

    await doctor.save();
    res
      .status(200)
      .json({ message: "Профіль лікаря оновлено успішно.", doctor });
  } catch (error) {
    console.error("Помилка при оновленні профілю лікаря:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при оновленні профілю лікаря." });
  }
};

// PATCH /admin/patients/:id
exports.adminUpdatePatient = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Невалідний ID пацієнта." });
  }

  try {
    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({ message: "Пацієнта не знайдено." });
    }

    const allowedFields = [
      "name",
      "email",
      "phone",
      "avatar",
      "birthDate",
      "height",
      "weight",
      "bloodType",
      "gender",
      "allergies",
      "chronicDiseases",
      "isBlocked",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        patient[field] = updates[field];
      }
    });

    await patient.save();
    res
      .status(200)
      .json({ message: "Профіль пацієнта оновлено успішно.", patient });
  } catch (error) {
    console.error("Помилка при оновленні профілю пацієнта:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при оновленні профілю пацієнта." });
  }
};

// PATCH /admin/appointments/:id/cancel
exports.adminCancelAppointment = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Невалідний ID апоінтменту." });
  }

  if (!reason || reason.trim().length < 5 || reason.trim().length > 100) {
    return res.status(400).json({
      message: "Причина скасування повинна містити від 5 до 100 символів.",
    });
  }

  try {
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: "Апоінтмент не знайдено." });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({ message: "Апоінтмент вже скасовано." });
    }

    appointment.status = "cancelled";
    appointment.cancelReason = reason.trim();
    await appointment.save();

    res
      .status(200)
      .json({ message: "Апоінтмент успішно скасовано.", appointment });
  } catch (error) {
    console.error("Помилка при скасуванні апоінтменту:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при скасуванні апоінтменту." });
  }
};

// GET /admin/stats
exports.getAdminStats = async (req, res) => {
  try {
    const { from, to } = req.query;

    const fromDate = from ? new Date(from) : new Date("2000-01-01");
    const toDate = to ? new Date(to) : new Date();

    const [totalDoctors, totalPatients] = await Promise.all([
      Doctor.countDocuments(),
      Patient.countDocuments(),
    ]);

    const daily = await Appointment.aggregate([
      {
        $match: {
          createdAt: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          stats: {
            $push: {
              k: "$_id.status",
              v: "$count",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          data: { $arrayToObject: "$stats" },
        },
      },
      { $sort: { date: 1 } },
    ]);

    const dailyStats = daily.map((d) => ({
      date: d.date,
      Created: Object.values(d.data).reduce((sum, val) => sum + val, 0),
      Passed: d.data.passed || 0,
      Cancelled: d.data.cancelled || 0,
    }));

    const totalCreated = dailyStats.reduce((sum, d) => sum + d.Created, 0);
    const totalPassed = dailyStats.reduce((sum, d) => sum + d.Passed, 0);
    const totalCancelled = dailyStats.reduce((sum, d) => sum + d.Cancelled, 0);

    res.status(200).json({
      totalDoctors,
      totalPatients,
      appointmentsCreated: totalCreated,
      appointmentsPassed: totalPassed,
      appointmentsCancelled: totalCancelled,
      from: fromDate.toISOString().split("T")[0],
      to: toDate.toISOString().split("T")[0],
      daily: dailyStats,
    });
  } catch (error) {
    console.error("Помилка при отриманні статистики:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при отриманні статистики." });
  }
};

// GET /admin/stats/doctor/:doctorId
exports.getDoctorStats = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { from, to } = req.query;

    const fromDate = from ? new Date(from) : new Date("2000-01-01");
    const toDate = to ? new Date(to) : new Date();

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Лікаря не знайдено" });
    }

    const daily = await Appointment.aggregate([
      {
        $match: {
          doctor: doctor._id,
          date: {
            $gte: fromDate.toISOString().split("T")[0],
            $lte: toDate.toISOString().split("T")[0],
          },
        },
      },
      {
        $group: {
          _id: {
            date: "$date",
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          stats: {
            $push: {
              k: "$_id.status",
              v: "$count",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          data: { $arrayToObject: "$stats" },
        },
      },
      { $sort: { date: 1 } },
    ]);

    const dailyStats = daily.map((d) => ({
      date: d.date,
      Created: Object.values(d.data).reduce((sum, val) => sum + val, 0),
      Passed: d.data.passed || 0,
      Cancelled: d.data.cancelled || 0,
    }));

    const totalCreated = dailyStats.reduce((sum, d) => sum + d.Created, 0);
    const totalPassed = dailyStats.reduce((sum, d) => sum + d.Passed, 0);
    const totalCancelled = dailyStats.reduce((sum, d) => sum + d.Cancelled, 0);

    res.status(200).json({
      doctorId: doctor._id,
      doctorName: doctor.name,
      specialization: doctor.specialization || null,
      from: fromDate.toISOString().split("T")[0],
      to: toDate.toISOString().split("T")[0],
      appointmentsCreated: totalCreated,
      appointmentsPassed: totalPassed,
      appointmentsCancelled: totalCancelled,
      daily: dailyStats,
    });
  } catch (error) {
    console.error("Помилка при отриманні статистики лікаря:", error);
    res.status(500).json({ message: "Помилка сервера при статистиці лікаря" });
  }
};

// PATCH /admin/remove-avatar
exports.adminRemoveAvatar = async (req, res) => {
  const { role, id } = req.params;

  if (!["doctor", "patient"].includes(role)) {
    return res.status(400).json({ message: "Невірна роль користувача." });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Невалідний ID користувача." });
  }

  const Model = role === "doctor" ? Doctor : Patient;

  try {
    const user = await Model.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Користувача не знайдено." });
    }

    if (user.avatar) {
      const fullPath = path.join(__dirname, "../", user.avatar);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    user.avatar = null;
    await user.save();

    res.status(200).json({ message: "Аватарку успішно видалено." });
  } catch (error) {
    console.error("Помилка при видаленні аватарки:", error);
    res
      .status(500)
      .json({ message: "Помилка сервера при видаленні аватарки." });
  }
};
