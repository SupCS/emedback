const Appointment = require("../models/Appointment");

const updatePastAppointments = async () => {
  try {
    const now = new Date();

    const confirmedAppointments = await Appointment.find({
      status: "confirmed",
    });

    const appointmentsToUpdate = [];

    for (const appointment of confirmedAppointments) {
      const fullDateTimeStr = `${appointment.date}T${appointment.endTime}:00`;
      const endDateTime = new Date(fullDateTimeStr);

      if (endDateTime < now) {
        appointmentsToUpdate.push(appointment);
      }
    }

    if (appointmentsToUpdate.length > 0) {
      for (const appointment of appointmentsToUpdate) {
        appointment.status = "passed";
        await appointment.save();
      }

      console.log(
        `✅ Оновлено статус до "passed" у ${appointmentsToUpdate.length} записів.`
      );
    }
  } catch (error) {
    console.error("❌ Помилка при оновленні статусів записів:", error);
  }
};

module.exports = updatePastAppointments;
