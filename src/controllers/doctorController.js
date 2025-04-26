const Doctor = require("../models/Doctor");
const mongoose = require("mongoose");

// Отримання списку всіх лікарів з фільтрацією
exports.getFilteredDoctors = async (req, res) => {
  try {
    const { specialization, rating } = req.query;
    let baseFilter = { isBlocked: { $ne: true } }; // без заблокованих

    if (specialization && typeof specialization === "string") {
      const specializations = specialization.split(",").map((s) => s.trim());
      baseFilter.specialization = { $in: specializations };
    }

    const minRating = rating ? parseFloat(rating) : null;

    if (minRating !== null && isNaN(minRating)) {
      return res.status(400).json({ message: "Невірний формат рейтингу." });
    }

    const query = {
      ...baseFilter,
      ...(minRating !== null ? { rating: { $gte: minRating } } : {}),
    };

    const doctors = await Doctor.find(query)
      .select("name specialization rating ratingCount avatar")
      .sort({ rating: -1 });

    res.status(200).json(doctors);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Сталася помилка сервера. Спробуйте пізніше." });
  }
};

// Отримання деталей лікаря
exports.getDoctorDetails = async (req, res) => {
  const { doctorId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Некоректний ID лікаря." });
    }

    const doctor = await Doctor.findById(doctorId).select(
      "name email specialization experience rating ratingCount bio avatar"
    );

    if (!doctor) {
      return res.status(404).json({ message: "Лікаря не знайдено." });
    }

    res.status(200).json(doctor);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Сталася помилка сервера. Спробуйте пізніше." });
  }
};
