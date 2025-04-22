const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const DoctorSchedule = require("../models/DoctorSchedule");
const Chat = require("../models/Chat");
const { scheduleAppointmentJob } = require("../utils/scheduler");
const { db } = require("../config/firebase");

exports.createAppointment = async (req, res) => {
  const { doctorId, date, startTime, endTime } = req.body;
  const patientId = req.user.id;

  try {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found." });

    const doctorSchedule = await DoctorSchedule.findOne({
      doctorId,
      "availability.date": date,
    });
    if (!doctorSchedule)
      return res
        .status(400)
        .json({ message: "No available slots on this date." });

    const dayAvailability = doctorSchedule.availability.find(
      (day) => day.date === date
    );
    const isSlotAvailable = dayAvailability.slots.some(
      (slot) => slot.startTime === startTime && slot.endTime === endTime
    );

    if (!isSlotAvailable)
      return res
        .status(400)
        .json({ message: "Selected time slot is not available." });

    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date,
      startTime,
      endTime,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingAppointment)
      return res.status(400).json({ message: "Time slot already booked." });

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
          const filteredSlots = day.slots.filter(
            (slot) =>
              !(slot.startTime === startTime && slot.endTime === endTime)
          );
          return filteredSlots.length === 0
            ? null
            : { date: day.date, slots: filteredSlots };
        }
        return day;
      })
      .filter((day) => day !== null);
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

    res.status(201).json({
      message: "Appointment created successfully.",
      appointment: newAppointment,
      chatId: chat._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  const { appointmentId } = req.params;
  const { status } = req.body;

  if (!["confirmed", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found." });

    if (String(appointment.doctor) !== req.user.id) {
      return res.status(403).json({ message: "Access denied." });
    }

    if (appointment.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Cannot update a cancelled appointment." });
    }

    appointment.status = status;
    await appointment.save();

    if (status === "confirmed") {
      const io = req.app.get("io");
      scheduleAppointmentJob(appointment, io);
    }

    res.json({ message: `Appointment status updated to ${status}.` });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    res.status(500).json({ message: "Server error." });
  }
};

exports.getDoctorAppointments = async (req, res) => {
  const { doctorId } = req.params;
  if (req.user.role === "doctor" && req.user.id !== doctorId) {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    const appointments = await Appointment.find({ doctor: doctorId })
      .populate("patient", "name email phone")
      .sort({ date: 1, startTime: 1 });

    res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
};

exports.getPatientAppointments = async (req, res) => {
  const { patientId } = req.params;
  if (req.user.role === "patient" && req.user.id !== patientId) {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    const appointments = await Appointment.find({ patient: patientId })
      .populate("doctor", "name specialization")
      .sort({ date: 1, startTime: 1 });

    res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
};

exports.cancelAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { id, role } = req.user;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found." });

    const isOwner =
      (role === "doctor" && String(appointment.doctor) === id) ||
      (role === "patient" && String(appointment.patient) === id);

    if (!isOwner) return res.status(403).json({ message: "Access denied." });

    if (appointment.status !== "confirmed") {
      return res
        .status(400)
        .json({ message: "Only confirmed appointments can be cancelled." });
    }

    appointment.status = "cancelled";
    await appointment.save();

    res.json({ message: "Appointment cancelled successfully." });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    res.status(500).json({ message: "Server error." });
  }
};

exports.getActiveAppointmentByChat = async (req, res) => {
  const { chatId } = req.params;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Чат не знайдено" });

    const [participant1, participant2] = chat.participants;
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const appointment = await Appointment.findOne({
      doctor: { $in: [participant1, participant2] },
      patient: { $in: [participant1, participant2] },
      status: "confirmed",
      date: today,
    });

    if (!appointment) return res.json({ isActive: false });

    const startDateTime = new Date(
      `${appointment.date}T${appointment.startTime}:00`
    );
    const endDateTime = new Date(
      `${appointment.date}T${appointment.endTime}:00`
    );
    const isActive = now >= startDateTime && now < endDateTime;

    let firestoreCallId = null;
    if (isActive) {
      const callsSnapshot = await db
        .collection("calls")
        .where("appointmentId", "==", appointment._id.toString())
        .get();

      if (!callsSnapshot.empty) {
        firestoreCallId = callsSnapshot.docs[0].id;
      }
    }

    return res.json({
      isActive,
      appointment,
      firestoreCallId,
    });
  } catch (error) {
    console.error("❌ Помилка при перевірці апоінтменту:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
