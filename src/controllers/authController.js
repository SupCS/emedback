const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");

// Реєстрація нового пацієнта
exports.registerPatient = async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Будь ласка, заповніть усі обов'язкові поля." });
  }

  try {
    const [existingPatient, existingDoctor] = await Promise.all([
      Patient.findOne({ email: email.trim().toLowerCase() }),
      Doctor.findOne({ email: email.trim().toLowerCase() }),
    ]);

    if (existingPatient || existingDoctor) {
      return res.status(400).json({ message: "Цей email вже зареєстровано." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newPatient = new Patient({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone: phone?.trim(),
    });

    await newPatient.save();

    res.status(201).json({
      message: "Реєстрація пройшла успішно.",
      patient: {
        id: newPatient._id,
        name: newPatient.name,
        email: newPatient.email,
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Внутрішня помилка сервера. Спробуйте пізніше." });
  }
};

// Логін пацієнта або лікаря
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Будь ласка, введіть email і пароль." });
  }

  try {
    const [patient, doctor] = await Promise.all([
      Patient.findOne({ email: email.trim().toLowerCase() }).select(
        "+password"
      ),
      Doctor.findOne({ email: email.trim().toLowerCase() }).select("+password"),
    ]);

    const user = patient || doctor;
    const role = patient ? "patient" : doctor ? "doctor" : null;

    if (!user) {
      return res.status(401).json({ message: "Невірний email або пароль." });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Ваш акаунт заблоковано." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Невірний email або пароль." });
    }

    const token = jwt.sign(
      { id: user._id, role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Вхід успішний.",
      token,
      role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Внутрішня помилка сервера. Спробуйте пізніше." });
  }
};
