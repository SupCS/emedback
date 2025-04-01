const Appointment = require("../models/Appointment");

const updatePastAppointments = async () => {
  try {
    const now = new Date();

    // Знаходимо всі підтверджені записи, які вже завершилися
    const appointmentsToUpdate = await Appointment.find({
      status: "confirmed",
      $expr: {
        $lt: [
          {
            $dateFromString: {
              dateString: { $concat: ["$date", "T", "$endTime"] },
            },
          },
          now,
        ],
      },
    });

    if (appointmentsToUpdate.length > 0) {
      console.log(
        `Знайдено записів для оновлення: ${appointmentsToUpdate.length}`
      );

      for (const appointment of appointmentsToUpdate) {
        appointment.status = "passed";
        await appointment.save();
      }

      console.log("Статуси оновлено.");
    } else {
      console.log("ℹНемає записів для оновлення.");
    }
  } catch (error) {
    console.error("Помилка при оновленні статусів записів:", error);
  }
};

module.exports = updatePastAppointments;
