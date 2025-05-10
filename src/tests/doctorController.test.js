const {
  getFilteredDoctors,
  getDoctorDetails,
} = require("../controllers/doctorController");
const Doctor = require("../models/Doctor");
const mongoose = require("mongoose");

jest.mock("../models/Doctor");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Doctor Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getFilteredDoctors", () => {
    it("should return 200 and filtered doctors", async () => {
      const req = {
        query: {
          specialization: "Кардіологія,Неврологія",
          rating: "4.5",
        },
      };
      const res = mockRes();

      const mockDoctors = [
        { name: "Доктор A", specialization: "Кардіологія", rating: 4.7 },
      ];

      Doctor.find.mockReturnValue({
        select: () => ({ sort: () => Promise.resolve(mockDoctors) }),
      });

      await getFilteredDoctors(req, res);

      expect(Doctor.find).toHaveBeenCalledWith({
        isBlocked: { $ne: true },
        specialization: { $in: ["Кардіологія", "Неврологія"] },
        rating: { $gte: 4.5 },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDoctors);
    });

    it("should return 400 for invalid rating value", async () => {
      const req = {
        query: {
          rating: "not-a-number",
        },
      };
      const res = mockRes();

      await getFilteredDoctors(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Невірний формат рейтингу.",
      });
    });
  });

  describe("getDoctorDetails", () => {
    it("should return 200 with doctor details", async () => {
      const doctorId = new mongoose.Types.ObjectId();
      const req = { params: { doctorId } };
      const res = mockRes();

      const doctorData = {
        name: "Доктор Тест",
        email: "doc@example.com",
        specialization: "Терапевт",
        experience: 5,
        rating: 4.6,
        ratingCount: 10,
        bio: "bio",
        avatar: "avatar.png",
      };

      Doctor.findById.mockReturnValue({
        select: () => Promise.resolve(doctorData),
      });

      await getDoctorDetails(req, res);

      expect(Doctor.findById).toHaveBeenCalledWith(doctorId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(doctorData);
    });

    it("should return 404 if doctor not found", async () => {
      const doctorId = new mongoose.Types.ObjectId();
      const req = { params: { doctorId } };
      const res = mockRes();

      Doctor.findById.mockReturnValue({ select: () => Promise.resolve(null) });

      await getDoctorDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Лікаря не знайдено." });
    });
  });
});
