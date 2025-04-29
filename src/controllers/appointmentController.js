const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const DoctorSchedule = require("../models/DoctorSchedule");
const Chat = require("../models/Chat");
const {
  scheduleAppointmentStartJob,
  scheduleAppointmentEndJob,
} = require("../utils/scheduler");
const { db } = require("../config/firebase");

const SERVER_TIME_OFFSET_MS = -3 * 60 * 60 * 1000;

// Створення нового запису на прийом
exports.createAppointment = async (req, res) => {
  const { doctorId, date, startTime, endTime } = req.body;
  const patientId = req.user.id;

  if (!doctorId || !date || !startTime || !endTime) {
    return res.status(400).json({ message: "Всі поля обов'язкові." });
  }

  try {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Лікаря не знайдено." });
    }

    const doctorSchedule = await DoctorSchedule.findOne({
      doctorId,
      "availability.date": date,
    });

    if (!doctorSchedule) {
      return res
        .status(400)
        .json({ message: "На цю дату немає вільних слотів." });
    }

    const dayAvailability = doctorSchedule.availability.find(
      (day) => day.date === date
    );
    const isSlotAvailable = dayAvailability?.slots.some(
      (slot) => slot.startTime === startTime && slot.endTime === endTime
    );

    if (!isSlotAvailable) {
      return res
        .status(400)
        .json({ message: "Обраний часовий слот недоступний." });
    }

    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date,
      startTime,
      endTime,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingAppointment) {
      return res
        .status(400)
        .json({ message: "Цей часовий слот вже зайнятий." });
    }

    const newAppointment = new Appointment({
      doctor: doctorId,
      patient: patientId,
      date,
      startTime,
      endTime,
      status: "pending",
    });

    await newAppointment.save();

    doctorSchedule.availability = doctorSchedule.availability
      .map((day) => {
        if (day.date === date) {
          const updatedSlots = day.slots.filter(
            (slot) =>
              !(slot.startTime === startTime && slot.endTime === endTime)
          );
          return updatedSlots.length > 0
            ? { date: day.date, slots: updatedSlots }
            : null;
        }
        return day;
      })
      .filter(Boolean);

    await doctorSchedule.save();

    let chat = await Chat.findOne({
      participants: { $all: [doctorId, patientId] },
    });

    if (!chat) {
      chat = new Chat({
        participants: [doctorId, patientId],
        participantModel: ["Doctor", "Patient"],
      });
      await chat.save();
    }

    scheduleAppointmentEndJob(newAppointment);

    // Сповіщення лікарю через сокет
    const io = req.app.get("io");
    const payload = {
      _id: newAppointment._id,
      date: newAppointment.date,
      startTime: newAppointment.startTime,
      endTime: newAppointment.endTime,
      patientId,
      status: newAppointment.status,
    };

    const { users } = require("../socket/state");
    const doctorSockets = users.get(doctorId);
    if (doctorSockets) {
      for (const socketId of doctorSockets) {
        io.to(socketId).emit("newAppointmentRequest", payload);
      }
    }

    res.status(201).json({
      message: "Запис створено успішно.",
      appointment: newAppointment,
      chatId: chat._id,
    });
  } catch (error) {
    console.error("Помилка створення запису:", error);
    res.status(500).json({ message: "Помилка сервера." });
  }
};

// Оновлення статусу запису (підтвердження або скасування)
exports.updateAppointmentStatus = async (req, res) => {
  const { appointmentId } = req.params;
  const { status } = req.body;

  if (!["confirmed", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "Недопустиме значення статусу." });
  }

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Запис не знайдено." });
    }

    if (String(appointment.doctor) !== req.user.id) {
      return res.status(403).json({ message: "Доступ заборонено." });
    }

    if (appointment.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Неможливо змінити скасований запис." });
    }

    appointment.status = status;
    await appointment.save();

    const io = req.app.get("io");
    if (status === "confirmed") {
      scheduleAppointmentStartJob(appointment, io);
      scheduleAppointmentEndJob(appointment);
    }

    // Сповіщення пацієнту через сокет
    const { users } = require("../socket/state");
    const patientSockets = users.get(appointment.patient.toString());
    const payload = {
      _id: appointment._id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      doctorId: appointment.doctor,
      status: appointment.status,
    };

    if (patientSockets) {
      for (const socketId of patientSockets) {
        io.to(socketId).emit("appointmentStatusChanged", payload);
      }
    }

    res.status(200).json({ message: `Статус запису оновлено на '${status}'.` });
  } catch (error) {
    console.error("Помилка оновлення статусу:", error);
    res.status(500).json({ message: "Помилка сервера." });
  }
};

// Отримання всіх записів певного лікаря
exports.getDoctorAppointments = async (req, res) => {
  const { doctorId } = req.params;

  if (req.user.role === "doctor" && req.user.id !== doctorId) {
    return res.status(403).json({ message: "Доступ заборонено." });
  }

  try {
    const appointments = await Appointment.find({ doctor: doctorId })
      .populate("patient", "name email phone")
      .sort({ date: 1, startTime: 1 });

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Помилка отримання записів лікаря:", error);
    res.status(500).json({ message: "Помилка сервера." });
  }
};

// Отримання всіх записів певного пацієнта
exports.getPatientAppointments = async (req, res) => {
  const { patientId } = req.params;

  if (req.user.role === "patient" && req.user.id !== patientId) {
    return res.status(403).json({ message: "Доступ заборонено." });
  }

  try {
    const appointments = await Appointment.find({ patient: patientId })
      .populate("doctor", "name specialization")
      .sort({ date: 1, startTime: 1 });

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Помилка отримання записів пацієнта:", error);
    res.status(500).json({ message: "Помилка сервера." });
  }
};

// Скасування підтвердженого запису
exports.cancelAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { id, role } = req.user;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Запис не знайдено." });
    }

    const isOwner =
      (role === "doctor" && String(appointment.doctor) === id) ||
      (role === "patient" && String(appointment.patient) === id);

    if (!isOwner) {
      return res.status(403).json({ message: "Доступ заборонено." });
    }

    if (appointment.status !== "confirmed") {
      return res
        .status(400)
        .json({ message: "Можна скасувати лише підтверджений запис." });
    }

    appointment.status = "cancelled";
    await appointment.save();

    res.status(200).json({ message: "Запис скасовано успішно." });
  } catch (error) {
    console.error("Помилка скасування запису:", error);
    res.status(500).json({ message: "Помилка сервера." });
  }
};

// Отримання активного запису за ID чату
exports.getActiveAppointmentByChat = async (req, res) => {
  const { chatId } = req.params;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Чат не знайдено." });
    }

    const [participant1, participant2] = chat.participants;
    let now = new Date();
    now = new Date(now.getTime() + SERVER_TIME_OFFSET_MS);

    const today = now.toISOString().split("T")[0];

    const appointment = await Appointment.findOne({
      doctor: { $in: [participant1, participant2] },
      patient: { $in: [participant1, participant2] },
      status: { $in: ["pending", "confirmed"] },
      date: today,
    });

    if (!appointment) {
      return res.json({ isActive: false, firestoreCallId: null });
    }

    const startDateTime = new Date(
      `${appointment.date}T${appointment.startTime}:00`
    );
    const endDateTime = new Date(
      `${appointment.date}T${appointment.endTime}:00`
    );

    const isActive = now >= startDateTime && now < endDateTime;
    console.log("now: ", now);
    console.log("start: ", startDateTime);
    console.log("end: ", endDateTime);

    let firestoreCallId = null;

    if (isActive) {
      // Якщо appointment зараз активний — шукаємо кімнату у Firestore
      const callsSnapshot = await db
        .collection("calls")
        .where("appointmentId", "==", appointment._id.toString())
        .get();

      if (!callsSnapshot.empty) {
        firestoreCallId = callsSnapshot.docs[0].id;
      }
    }

    res.status(200).json({
      isActive,
      appointment,
      firestoreCallId,
    });
  } catch (error) {
    console.error("Помилка перевірки активного запису:", error);
    res.status(500).json({ message: "Помилка сервера." });
  }
};
