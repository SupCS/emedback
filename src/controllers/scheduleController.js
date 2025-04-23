const DoctorSchedule = require("../models/DoctorSchedule");
const Appointment = require("../models/Appointment");

// Перевірка перетину слотів
const isOverlapping = (existingSlots, newSlot) => {
  const newStart = parseInt(newSlot.startTime.replace(":", ""), 10);
  const newEnd = parseInt(newSlot.endTime.replace(":", ""), 10);

  return existingSlots.some((slot) => {
    const existingStart = parseInt(slot.startTime.replace(":", ""), 10);
    const existingEnd = parseInt(slot.endTime.replace(":", ""), 10);
    return newStart < existingEnd && newEnd > existingStart;
  });
};

// Перевірка перетину з апоінтментами
const isOverlappingWithAppointments = async (doctorId, date, slot) => {
  const appointments = await Appointment.find({
    doctor: doctorId,
    date,
    status: { $in: ["pending", "confirmed"] },
  });

  const newStart = parseInt(slot.startTime.replace(":", ""), 10);
  const newEnd = parseInt(slot.endTime.replace(":", ""), 10);

  return appointments.some((appt) => {
    const apptStart = parseInt(appt.startTime.replace(":", ""), 10);
    const apptEnd = parseInt(appt.endTime.replace(":", ""), 10);
    return newStart < apptEnd && newEnd > apptStart;
  });
};

// Перевірка допустимої тривалості слоту
const isValidSlotDuration = (startTime, endTime) => {
  const start = parseInt(startTime.replace(":", ""), 10);
  const end = parseInt(endTime.replace(":", ""), 10);
  const duration = end - start;
  return duration >= 1 && duration <= 200;
};

// Перевірка, що слот не створюється в минулому
const isFutureDate = (date, startTime) => {
  const now = new Date();
  const slotDateTime = new Date(date + "T" + startTime + ":00");
  return slotDateTime > now;
};

// Додавання або оновлення слоту лікарем
exports.addOrUpdateSlot = async (req, res) => {
  const { date, slots } = req.body;
  const doctorId = req.user.id;

  if (!date || !slots || !Array.isArray(slots)) {
    return res.status(400).json({ message: "Невірний формат даних." });
  }

  for (let slot of slots) {
    if (!isValidSlotDuration(slot.startTime, slot.endTime)) {
      return res.status(400).json({
        message: `Слот ${slot.startTime} - ${slot.endTime} повинен бути тривалістю від 10 хвилин до 2 годин.`,
      });
    }

    if (!isFutureDate(date, slot.startTime)) {
      return res.status(400).json({
        message: `Слот ${slot.startTime} на ${date} знаходиться в минулому і не може бути створений.`,
      });
    }

    const overlapsWithAppointments = await isOverlappingWithAppointments(
      doctorId,
      date,
      slot
    );

    if (overlapsWithAppointments) {
      return res.status(400).json({
        message: `Слот ${slot.startTime} - ${slot.endTime} перетинається з існуючим записом на прийом на ${date}.`,
      });
    }
  }

  try {
    let schedule = await DoctorSchedule.findOne({ doctorId });

    if (!schedule) {
      schedule = new DoctorSchedule({
        doctorId,
        availability: [{ date, slots }],
      });
    } else {
      let daySchedule = schedule.availability.find((d) => d.date === date);

      if (!daySchedule) {
        schedule.availability.push({ date, slots });
      } else {
        for (let newSlot of slots) {
          if (isOverlapping(daySchedule.slots, newSlot)) {
            return res.status(400).json({
              message: `Слот ${newSlot.startTime} - ${newSlot.endTime} перетинається з існуючим слотом на ${date}.`,
            });
          }
        }
        daySchedule.slots.push(...slots);
      }
    }

    await schedule.save();
    res.status(201).json({ message: "Графік успішно оновлено", schedule });
  } catch (error) {
    console.error("Помилка при оновленні графіка:", error);
    res.status(500).json({ message: "Сталася помилка на сервері." });
  }
};

// Видалення слоту лікарем
exports.removeSlot = async (req, res) => {
  const { date, startTime, endTime } = req.body;
  const doctorId = req.user.id;

  if (!date || !startTime || !endTime) {
    return res.status(400).json({ message: "Невірний формат даних." });
  }

  try {
    let schedule = await DoctorSchedule.findOne({ doctorId });
    if (!schedule) {
      return res.status(404).json({ message: "Графік не знайдено." });
    }

    const daySchedule = schedule.availability.find((d) => d.date === date);
    if (!daySchedule) {
      return res.status(404).json({
        message: `Графік для дати ${date} не знайдено.`,
      });
    }

    const updatedSlots = daySchedule.slots.filter(
      (slot) => !(slot.startTime === startTime && slot.endTime === endTime)
    );

    if (updatedSlots.length === daySchedule.slots.length) {
      return res.status(404).json({ message: "Слот не знайдено." });
    }

    if (updatedSlots.length === 0) {
      schedule.availability = schedule.availability.filter(
        (d) => d.date !== date
      );
    } else {
      daySchedule.slots = updatedSlots;
    }

    await schedule.save();
    res.status(200).json({ message: "Слот успішно видалено", schedule });
  } catch (error) {
    console.error("Помилка при видаленні слоту:", error);
    res.status(500).json({ message: "Сталася помилка на сервері." });
  }
};

// Отримання графіка лікаря
exports.getDoctorSchedule = async (req, res) => {
  const { doctorId } = req.params;

  try {
    let schedule = await DoctorSchedule.findOne({ doctorId });

    if (!schedule) {
      return res.status(200).json({ doctorId, availability: [] });
    }

    const now = new Date();
    schedule.availability = schedule.availability
      .map((day) => ({
        date: day.date,
        slots: day.slots.filter(
          (slot) => new Date(day.date + "T" + slot.endTime + ":00") > now
        ),
      }))
      .filter((day) => day.slots.length > 0);

    await schedule.save();
    res.status(200).json(schedule);
  } catch (error) {
    console.error("Помилка при отриманні графіка:", error);
    res.status(500).json({ message: "Сталася помилка на сервері." });
  }
};
