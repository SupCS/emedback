const {
  updateProfile,
  uploadAvatar,
} = require("../controllers/profileController");

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

jest.mock("../models/Patient", () => ({
  findById: jest.fn(),
}));
jest.mock("../models/Doctor", () => ({
  findById: jest.fn().mockResolvedValue({ save: jest.fn() }),
}));

jest.mock("../config/firebase", () => ({
  storage: {
    name: "mock-bucket",
    file: () => ({
      save: jest.fn(),
      delete: jest.fn(),
    }),
  },
}));

// Мок юзера
const mockPatient = {
  save: jest.fn(),
  name: "Old Name",
  phone: "+380123456789",
  birthDate: new Date("1990-01-01"),
  height: 170,
  weight: 70,
  bloodType: "A+",
  gender: "male",
  allergies: [],
  chronicDiseases: [],
  passportNumber: "AB123456",
  address: "Kyiv",
  workplace: "Clinic",
};

const Patient = require("../models/Patient");
Patient.findById.mockResolvedValue(mockPatient);

describe("updateProfile - patient validation", () => {
  beforeEach(() => {
    mockPatient.save.mockClear();
  });

  it("should update valid patient fields", async () => {
    const req = {
      user: { id: "someid", role: "patient" },
      body: {
        name: "Нове Ім'я",
        phone: "+380987654321",
        height: 180,
        weight: 75,
        gender: "female",
        bloodType: "O+",
        allergies: ["Pil"],
        chronicDiseases: ["Asthma"],
      },
    };
    const res = makeRes();
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Профіль оновлено успішно.",
    });
  });

  it("should return 400 if name is invalid", async () => {
    const req = {
      user: { id: "someid", role: "patient" },
      body: { name: "a" },
    };
    const res = makeRes();
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/Ім'я/) })
    );
  });

  it("should return 400 if height is out of range", async () => {
    const req = {
      user: { id: "someid", role: "patient" },
      body: { height: 10 },
    };
    const res = makeRes();
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/Зріст/) })
    );
  });

  it("should return 400 if gender is wrong value", async () => {
    const req = {
      user: { id: "someid", role: "patient" },
      body: { gender: "unknown" },
    };
    const res = makeRes();
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/стать/) })
    );
  });

  it("should return 400 if bloodType is not in allowed list", async () => {
    const req = {
      user: { id: "someid", role: "patient" },
      body: { bloodType: "PP" },
    };
    const res = makeRes();
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/група крові/) })
    );
  });
});

describe("uploadAvatar", () => {
  it("should return 400 if no file is uploaded", async () => {
    const req = {
      user: { id: "someid", role: "patient" },
      file: null,
    };
    const res = makeRes();
    await uploadAvatar(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Файл не завантажено.",
    });
  });

  it("should return 404 if user is not found", async () => {
    const Patient = require("../models/Patient");
    Patient.findById.mockResolvedValueOnce(null);

    const req = {
      user: { id: "someid", role: "patient" },
      file: {
        buffer: Buffer.from("mock"),
        mimetype: "image/jpeg",
        originalname: "file.jpg",
      },
    };
    const res = makeRes();
    await uploadAvatar(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Користувача не знайдено.",
    });
  });

  it("should successfully upload avatar and return URL", async () => {
    const Patient = require("../models/Patient");
    Patient.findById.mockResolvedValueOnce({
      avatar: null,
      save: jest.fn(),
    });

    const req = {
      user: { id: "someid", role: "patient" },
      file: {
        buffer: Buffer.from("mock"),
        mimetype: "image/jpeg",
        originalname: "file.jpg",
      },
    };
    const res = makeRes();
    await uploadAvatar(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Аватарку оновлено.",
        avatar: expect.stringContaining(
          "https://firebasestorage.googleapis.com"
        ),
      })
    );
  });
});
