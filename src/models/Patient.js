const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
  // Основні дані
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/\S+@\S+\.\S+/, "Please enter a valid email address"],
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  phone: {
    type: String,
    required: false,
  },
  avatar: {
    type: String,
    default: null,
  },
  documents: [
    {
      _id: {
        type: mongoose.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
      },
      title: { type: String, required: true },
      url: { type: String, required: true },
      storagePath: { type: String, required: true },
    },
  ],
  // Біологічні дані
  birthDate: {
    type: Date,
    required: false,
  },
  height: {
    type: Number, // В сантиметрах
    required: false,
  },
  weight: {
    type: Number, // В кілограмах
    required: false,
  },
  bloodType: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    required: false,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    required: false,
  },

  // Медичні дані
  allergies: {
    type: [String],
    default: [],
  },
  chronicDiseases: {
    type: [String],
    default: [],
  },

  // Медичні записи
  medicalRecords: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicalRecord",
    },
  ],

  isBlocked: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Patient = mongoose.model("Patient", patientSchema);
module.exports = Patient;
