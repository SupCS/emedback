const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
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
    medicalRecords: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MedicalRecord",
        },
    ],
    appointments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Patient = mongoose.model("Patient", patientSchema);

module.exports = Patient;
