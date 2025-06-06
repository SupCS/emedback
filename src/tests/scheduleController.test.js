const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../app"); // переконайся, що це твій Express app
const DoctorSchedule = require("../models/DoctorSchedule");
const Appointment = require("../models/Appointment");

const JWT_SECRET = process.env.JWT_SECRET;
const doctorId = new mongoose.Types.ObjectId();
const token = jwt.sign({ id: doctorId, role: "doctor" }, JWT_SECRET);

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await DoctorSchedule.deleteMany({});
  await Appointment.deleteMany({ doctor: doctorId });
  await mongoose.connection.close();
});

describe("Schedule Controller", () => {
  it("should add a new slot if no overlap and valid", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateStr = futureDate.toISOString().split("T")[0];

    const res = await request(app)
      .post("/schedule/add")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: dateStr,
        slots: [{ startTime: "10:00", endTime: "11:00" }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Графік успішно оновлено.");
    expect(res.body.schedule).toBeDefined();
    expect(res.body.schedule.availability.length).toBeGreaterThan(0);
  });

  it("should not allow overlapping slots", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateStr = futureDate.toISOString().split("T")[0];

    const res = await request(app)
      .post("/schedule/add")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: dateStr,
        slots: [{ startTime: "10:30", endTime: "11:30" }], // перетин
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/перетинається/);
  });

  it("should return error if slot is in the past", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const dateStr = pastDate.toISOString().split("T")[0];

    const res = await request(app)
      .post("/schedule/add")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: dateStr,
        slots: [{ startTime: "10:00", endTime: "11:00" }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/в минулому/);
  });
});
