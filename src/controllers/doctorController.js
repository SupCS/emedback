const Doctor = require("../models/Doctor");

// Отримання списку всіх лікарів з фільтрацією
exports.getFilteredDoctors = async (req, res) => {
  try {
    const { specialization, rating } = req.query;
    let baseFilter = { isBlocked: { $ne: true } }; // виключаємо заблокованих

    if (specialization) {
      const specializations = specialization.split(",");
      baseFilter.specialization = { $in: specializations };
    }

    const minRating = rating ? parseFloat(rating) : null;

    if (minRating !== null && !isNaN(minRating)) {
      // Фільтрація відразу по rating
      const filteredDoctors = await Doctor.find({
        ...baseFilter,
        rating: { $gte: minRating },
      })
        .select("name specialization rating ratingCount avatar")
        .sort({ rating: -1 });

      return res.status(200).json(filteredDoctors);
    }

    // Якщо немає фільтра по рейтингу
    const allDoctors = await Doctor.find(baseFilter)
      .select("name specialization rating ratingCount avatar")
      .sort({ rating: -1 });

    res.status(200).json(allDoctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
};

// Отримання деталей лікаря
exports.getDoctorDetails = async (req, res) => {
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
};
