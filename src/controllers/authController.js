const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");

// Обробка реєстрації нового пацієнта
exports.registerPatient = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const [existingPatient, existingDoctor] = await Promise.all([
      Patient.findOne({ email }),
      Doctor.findOne({ email }),
    ]);

    if (existingPatient || existingDoctor) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
};

// Обробка логіну пацієнта або лікаря
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [patient, doctor] = await Promise.all([
      Patient.findOne({ email }).select("+password"),
      Doctor.findOne({ email }).select("+password"),
    ]);

    const user = patient || doctor;
    const role = patient ? "patient" : doctor ? "doctor" : null;

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account is blocked." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user._id, role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

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
    res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};
