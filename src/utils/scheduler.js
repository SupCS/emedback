const schedule = require("node-schedule");
const Appointment = require("../models/Appointment");
const { db } = require("../config/firebase");

const scheduledJobs = new Map();

function scheduleAppointmentJob(appointment, callback) {
  const { _id, date, startTime } = appointment;

  const dateTime = new Date(`${date}T${startTime}`);
  if (dateTime < new Date()) return; // Пропускаємо, якщо час уже минув

  console.log(`📅 Плануємо подію для appointment ${_id}`);
  console.log(
    `🕓 Заплановано на: ${dateTime.toISOString()} (локальний час: ${dateTime.toLocaleString()})`
  );

  const job = schedule.scheduleJob(dateTime, async () => {
    console.log(`🚨 Час прийому настав для appointment ${_id}`);

    try {
      const callRef = db.collection("calls").doc();

      await callRef.set({
        appointmentId: _id.toString(),
        createdAt: new Date().toISOString(),
      });

      console.log(`✅ WebRTC кімната створена: calls/${callRef.id}`);

      // 🟡 Отримуємо актуальний appointment з бази
      const freshAppointment = await Appointment.findById(_id);

      // 🟢 Передаємо його в callback з firestoreCallId
      if (freshAppointment) {
        callback({
          ...freshAppointment.toObject(),
          firestoreCallId: callRef.id,
        });
      } else {
        console.error(
          "❌ Appointment не знайдено у момент створення WebRTC-кімнати"
        );
        callback(null);
      }
    } catch (err) {
      console.error("❌ Помилка при створенні WebRTC кімнати:", err);
      callback(null);
    }

    scheduledJobs.delete(_id.toString());
  });

  scheduledJobs.set(_id.toString(), job);
  console.log(`✅ Подію заплановано: appointment ${_id}`);
}

function cancelScheduledJob(appointmentId) {
  const job = scheduledJobs.get(appointmentId);
  if (job) {
    job.cancel();
    scheduledJobs.delete(appointmentId);
  }
}

// 🟡 Плануємо всі підтверджені апоінтменти при запуску сервера
async function rescheduleAllAppointments(io) {
  try {
    const now = new Date();
    const appointments = await Appointment.find({
      status: "confirmed",
      $expr: {
        $gt: [
          {
            $dateFromString: {
              dateString: { $concat: ["$date", "T", "$startTime"] },
            },
          },
          now,
        ],
      },
    });

    console.log(
      `Знайдено ${appointments.length} підтверджених апоінтментів для планування`
    );

    for (const appt of appointments) {
      const chatId = null;
      scheduleAppointmentJob(appt, (readyAppt) => {
        const payload = {
          message: "Ваш прийом починається!",
          appointmentId: readyAppt._id,
          chatId: chatId,
          firestoreCallId: readyAppt.firestoreCallId || null,
        };

        const users = require("../socket").getIoUsers();

        const patientSocketId = users.get(readyAppt.patient.toString());
        const doctorSocketId = users.get(readyAppt.doctor.toString());

        if (patientSocketId)
          io.to(patientSocketId).emit("appointmentStart", payload);
        if (doctorSocketId)
          io.to(doctorSocketId).emit("appointmentStart", payload);
      });
    }
  } catch (error) {
    console.error("Помилка при переплануванні апоінтментів:", error);
  }
}

module.exports = {
  scheduleAppointmentJob,
  cancelScheduledJob,
  rescheduleAllAppointments,
};
