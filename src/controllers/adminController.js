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

// POST /admin/login
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: admin._id, role: "admin", name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.status(200).json({
      message: "Admin login successful.",
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({ message: "Server error during admin login." });
  }
};

// GET /admin/profile
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    res.json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      createdAt: admin.createdAt,
    });
  } catch (error) {
    console.error("❌ Fetch admin profile error:", error);
    res.status(500).json({ message: "Server error fetching profile." });
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
    console.error("❌ Fetch doctors error:", error);
    res.status(500).json({ message: "Server error fetching doctors." });
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
    console.error("❌ Fetch patients error:", error);
    res.status(500).json({ message: "Server error fetching patients." });
  }
};

// GET /admin/appointments
exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("doctor", "name email")
      .populate("patient", "name email");
    res.json(appointments);
  } catch (error) {
    console.error("❌ Fetch appointments error:", error);
    res.status(500).json({ message: "Server error fetching appointments." });
  }
};

// GET /admin/prescriptions
exports.getAllPrescriptions = async (req, res) => {
  try {
    const { doctor, patient, from, to } = req.query;

    const filter = {};

    if (doctor) {
      filter.doctor = doctor;
    }

    if (patient) {
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
      .populate("doctor", "name email")
      .populate("patient", "name email");

    res.json(prescriptions);
  } catch (error) {
    console.error("❌ Fetch prescriptions error:", error);
    res.status(500).json({ message: "Server error fetching prescriptions." });
  }
};

exports.deletePrescription = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Prescription.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Prescription not found." });
    }

    res.json({ message: "Prescription deleted successfully." });
  } catch (error) {
    console.error("❌ Error deleting prescription:", error);
    res.status(500).json({ message: "Server error deleting prescription." });
  }
};

// POST /admin/doctors
exports.addDoctor = async (req, res) => {
  const { name, email, password, phone, specialization, experience, bio } =
    req.body;

  try {
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ message: "Email already exists." });
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
      .json({ message: "Doctor created successfully.", doctor: newDoctor });
  } catch (error) {
    console.error("❌ Error creating doctor:", error);
    res.status(500).json({ message: "Server error creating doctor." });
  }
};

// DELETE /admin/doctors/:id
exports.deleteDoctor = async (req, res) => {
  const doctorId = req.params.id;

  try {
    const doctor = await Doctor.findByIdAndDelete(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    // 🔻 Видаляємо всі пов’язані графіки
    await DoctorSchedule.deleteOne({ doctorId });

    // 🔻 Видаляємо всі пов'язані апоінтменти
    await Appointment.deleteMany({ doctor: doctorId });

    res.json({ message: "Doctor and related data deleted successfully." });
  } catch (error) {
    console.error("❌ Error deleting doctor and related data:", error);
    res.status(500).json({ message: "Server error deleting doctor." });
  }
};

// PATCH /admin/doctors/:id/block
exports.blockDoctor = async (req, res) => {
  const doctorId = req.params.id;

  try {
    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      { isBlocked: true },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 5);

    // Очистка майбутніх слотів
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

    // Скасування майбутніх активних апоінтментів
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

    res.json({
      message: "Doctor blocked, slots cleared, and appointments cancelled.",
      doctor,
    });
  } catch (error) {
    console.error("Error blocking doctor:", error);
    res.status(500).json({ message: "Server error blocking doctor." });
  }
};

// PATCH /admin/doctors/:id/unblock
exports.unblockDoctor = async (req, res) => {
  const doctorId = req.params.id;
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      { isBlocked: false },
      { new: true }
    );
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }
    res.json({ message: "Doctor unblocked successfully.", doctor });
  } catch (error) {
    console.error("Error unblocking doctor:", error);
    res.status(500).json({ message: "Server error unblocking doctor." });
  }
};

// PATCH /admin/patients/:id/block
exports.blockPatient = async (req, res) => {
  const patientId = req.params.id;

  try {
    const patient = await Patient.findByIdAndUpdate(
      patientId,
      { isBlocked: true },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
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

    res.json({
      message: "Patient blocked and appointments cancelled.",
      patient,
    });
  } catch (error) {
    console.error("Error blocking patient:", error);
    res.status(500).json({ message: "Server error blocking patient." });
  }
};
// PATCH /admin/patients/:id/unblock
exports.unblockPatient = async (req, res) => {
  const patientId = req.params.id;
  try {
    const patient = await Patient.findByIdAndUpdate(
      patientId,
      { isBlocked: false },
      { new: true }
    );
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }
    res.json({ message: "Patient unblocked successfully.", patient });
  } catch (error) {
    console.error("Error unblocking patient:", error);
    res.status(500).json({ message: "Server error unblocking patient." });
  }
};

// PATCH /admin/doctors/:id
exports.adminUpdateDoctor = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    // Поля, які дозволено оновлювати
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
    res.json({ message: "Doctor updated successfully.", doctor });
  } catch (error) {
    console.error("Error updating doctor:", error);
    res.status(500).json({ message: "Server error updating doctor." });
  }
};

// PATCH /admin/patients/:id
exports.adminUpdatePatient = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Поля, які дозволено оновлювати
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
    res.json({ message: "Patient updated successfully.", patient });
  } catch (error) {
    console.error("Error updating patient:", error);
    res.status(500).json({ message: "Server error updating patient." });
  }
};

// PATCH /admin/appointments/:id/cancel
exports.adminCancelAppointment = async (req, res) => {
  const { id } = req.params;

  try {
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Appointment is already cancelled." });
    }

    appointment.status = "cancelled";
    await appointment.save();

    res.json({ message: "Appointment cancelled successfully.", appointment });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    res.status(500).json({ message: "Server error cancelling appointment." });
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

    // Щоденна статистика по appointments
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
          data: {
            $arrayToObject: "$stats",
          },
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);
    const dailyStats = daily.map((d) => ({
      date: d.date,
      Created: Object.values(d.data).reduce((sum, val) => sum + val, 0),
      Passed: d.data.passed || 0,
      Cancelled: d.data.cancelled || 0,
    }));

    // Загальна кількість за весь період
    const totalCreated = dailyStats.reduce((sum, d) => sum + d.Created, 0);
    const totalPassed = dailyStats.reduce((sum, d) => sum + d.Passed, 0);
    const totalCancelled = dailyStats.reduce((sum, d) => sum + d.Cancelled, 0);

    res.json({
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
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Server error fetching statistics." });
  }
};

exports.adminRemoveAvatar = async (req, res) => {
  const { role, id } = req.params;

  const model =
    role === "patient" ? Patient : role === "doctor" ? Doctor : null;
  if (!model) {
    return res.status(400).json({ message: "Invalid role." });
  }

  try {
    const user = await model.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.avatar) {
      const fullPath = path.join(__dirname, "../", user.avatar);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    user.avatar = null;
    await user.save();

    res.json({ message: "Аватарка успішно видалена." });
  } catch (error) {
    console.error("❌ Error removing avatar:", error);
    res.status(500).json({ message: "Server error removing avatar." });
  }
};
