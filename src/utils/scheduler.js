const schedule = require("node-schedule");
const Appointment = require("../models/Appointment");
const { db } = require("../config/firebase");
const { users } = require("../socket/state");
const Chat = require("../models/Chat");

const scheduledJobs = new Map();

// Зміщення серверного часу (Heroku UTC => локальне GMT+3)
const SERVER_TIME_OFFSET_MS = -3 * 60 * 60 * 1000;

// Функція миттєвого оновлення статусу завершеного appointment
async function handleAppointmentEndImmediately(appointmentId) {
  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      console.error(`Appointment ${appointmentId} не знайдено при закінченні`);
      return;
    }

    if (appointment.status === "confirmed") {
      appointment.status = "passed";
    } else if (appointment.status === "pending") {
      appointment.status = "cancelled";
    }

    await appointment.save();
    console.log(
      `Appointment ${appointmentId} оновлено на статус: ${appointment.status}`
    );
  } catch (error) {
    console.error("Помилка при оновленні статусу appointment:", error);
  }
}

// Планування запуску WebRTC-кімнати
function scheduleAppointmentStartJob(appointment, io) {
  const { _id, date, startTime } = appointment;

  let startDateTime = new Date(`${date}T${startTime}`);
  startDateTime = new Date(startDateTime.getTime() + SERVER_TIME_OFFSET_MS);

  if (startDateTime < new Date()) {
    console.log(`Appointment ${_id} вже почався, старт не плануємо`);
    return;
  }

  console.log(
    `Плануємо старт appointment ${_id} на ${startDateTime.toISOString()}`
  );

  const job = schedule.scheduleJob(startDateTime, async () => {
    console.log(`Час старту прийому настав для appointment ${_id}`);

    try {
      const callRef = db.collection("calls").doc();

      await callRef.set({
        appointmentId: _id.toString(),
        createdAt: new Date().toISOString(),
      });

      console.log(`WebRTC кімната створена: calls/${callRef.id}`);

      const freshAppointment = await Appointment.findById(_id);
      if (!freshAppointment) {
        console.error("Appointment не знайдено у момент старту");
        return;
      }

      const chat = await Chat.findOne({
        participants: {
          $all: [
            freshAppointment.doctor.toString(),
            freshAppointment.patient.toString(),
          ],
        },
      });

      const chatId = chat ? chat._id.toString() : null;

      const payload = {
        message: "Ваш прийом починається!",
        appointmentId: freshAppointment._id,
        chatId,
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

      if (patientSocketId) {
        io.to(patientSocketId).emit("appointmentStart", payload);
        console.log("Надіслано пацієнту appointmentStart");
      } else {
        console.warn("Пацієнт не підʼєднаний або socket неактивний");
      }

      if (doctorSocketId) {
        io.to(doctorSocketId).emit("appointmentStart", payload);
        console.log("Надіслано лікарю appointmentStart");
      } else {
        console.warn("Лікар не підʼєднаний або socket неактивний");
      }
    } catch (err) {
      console.error("Помилка при старті прийому:", err);
    }

    scheduledJobs.delete(`${_id}-start`);
  });

  scheduledJobs.set(`${_id}-start`, job);
}

// Планування оновлення статусу після завершення прийому
function scheduleAppointmentEndJob(appointment) {
  const { _id, date, endTime } = appointment;

  let endDateTime = new Date(`${date}T${endTime}:00`);
  endDateTime = new Date(endDateTime.getTime() + SERVER_TIME_OFFSET_MS);

  if (endDateTime < new Date()) {
    console.log(`Appointment ${_id} вже завершився, оновлюємо статус...`);
    handleAppointmentEndImmediately(_id);
    return;
  }

  console.log(
    `Плануємо закінчення appointment ${_id} на ${endDateTime.toISOString()}`
  );

  const job = schedule.scheduleJob(endDateTime, async () => {
    console.log(`Час закінчення прийому настав для appointment ${_id}`);
    await handleAppointmentEndImmediately(_id);
    scheduledJobs.delete(`${_id}-end`);
  });

  scheduledJobs.set(`${_id}-end`, job);
}

// Скасування запланованого job
function cancelScheduledJob(appointmentId) {
  const startJob = scheduledJobs.get(`${appointmentId}-start`);
  if (startJob) {
    startJob.cancel();
    scheduledJobs.delete(`${appointmentId}-start`);
    console.log(`Скасовано старт appointment ${appointmentId}`);
  }

  const endJob = scheduledJobs.get(`${appointmentId}-end`);
  if (endJob) {
    endJob.cancel();
    scheduledJobs.delete(`${appointmentId}-end`);
    console.log(`Скасовано кінець appointment ${appointmentId}`);
  }
}

// Перепланування всіх майбутніх appointment'ів
async function rescheduleAllAppointments(io) {
  try {
    const now = new Date();
    const appointments = await Appointment.find({
      status: { $in: ["pending", "confirmed"] },
      $expr: {
        $gt: [
          {
            $dateFromString: {
              dateString: { $concat: ["$date", "T", "$endTime"] },
            },
          },
          now,
        ],
      },
    });

    console.log(
      `Знайдено ${appointments.length} активних апоінтментів для перепланування`
    );

    for (const appt of appointments) {
      scheduleAppointmentStartJob(appt, io);
      scheduleAppointmentEndJob(appt);
    }
  } catch (error) {
    console.error("Помилка при переплануванні апоінтментів:", error);
  }
}

module.exports = {
  scheduleAppointmentStartJob,
  scheduleAppointmentEndJob,
  cancelScheduledJob,
  rescheduleAllAppointments,
};
