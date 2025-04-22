const schedule = require("node-schedule");
const Appointment = require("../models/Appointment");
const { db } = require("../config/firebase");
const { users } = require("../socket/state");

const scheduledJobs = new Map();

function scheduleAppointmentJob(appointment, io) {
  const { _id, date, startTime } = appointment;

  const dateTime = new Date(`${date}T${startTime}`);
  if (dateTime < new Date()) {
    console.warn(`⏩ Пропускаємо appointment ${_id}, час уже минув`);
    return;
  }

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

      const freshAppointment = await Appointment.findById(_id);
      if (!freshAppointment) {
        console.error(
          "❌ Appointment не знайдено у момент створення WebRTC-кімнати"
        );
        return;
      }

      console.log("🔄 Отримано оновлений appointment:", freshAppointment._id);

      const payload = {
        message: "Ваш прийом починається!",
        appointmentId: freshAppointment._id,
        chatId: null,
        firestoreCallId: callRef.id,
      };

      const patientSet = users.get(freshAppointment.patient.toString());
      const doctorSet = users.get(freshAppointment.doctor.toString());

      const patientSocketId = [...(patientSet || [])].find((id) =>
        io.sockets.sockets.has(id)
      );
      const doctorSocketId = [...(doctorSet || [])].find((id) =>
        io.sockets.sockets.has(id)
      );

      console.log("📡 Готуємо socket нотифікацію:");
      console.log("👤 Пацієнт socket ID:", patientSocketId);
      console.log("👨‍⚕️ Лікар socket ID:", doctorSocketId);

      if (patientSocketId) {
        io.to(patientSocketId).emit("appointmentStart", payload);
        console.log("✅ Надіслано пацієнту appointmentStart");
      } else {
        console.warn("⚠️ Пацієнт не підʼєднаний або socket неактивний");
      }

      if (doctorSocketId) {
        io.to(doctorSocketId).emit("appointmentStart", payload);
        console.log("✅ Надіслано лікарю appointmentStart");
      } else {
        console.warn("⚠️ Лікар не підʼєднаний або socket неактивний");
      }
    } catch (err) {
      console.error("❌ Помилка при створенні WebRTC кімнати:", err);
    }

    scheduledJobs.delete(_id.toString());
    console.log(`🧹 Видалено подію з scheduledJobs для appointment ${_id}`);
  });

  scheduledJobs.set(_id.toString(), job);
  console.log(`✅ Подію заплановано: appointment ${_id}`);
}

function cancelScheduledJob(appointmentId) {
  const job = scheduledJobs.get(appointmentId);
  if (job) {
    job.cancel();
    scheduledJobs.delete(appointmentId);
    console.log(`🛑 Скасовано подію для appointment ${appointmentId}`);
  }
}

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
      `🔄 Знайдено ${appointments.length} підтверджених апоінтментів для перепланування`
    );

    for (const appt of appointments) {
      scheduleAppointmentJob(appt, io);
    }
  } catch (error) {
    console.error("❌ Помилка при переплануванні апоінтментів:", error);
  }
}

module.exports = {
  scheduleAppointmentJob,
  cancelScheduledJob,
  rescheduleAllAppointments,
};
