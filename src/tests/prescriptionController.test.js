require("dotenv").config();
const {
  createPrescription,
  getPrescriptionsByPatient,
  getPrescriptionsByDoctor,
} = require("../controllers/prescriptionController");

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

jest.mock("../models/Appointment", () => ({
  findOne: jest.fn(),
}));

jest.mock("../models/Prescription", () => {
  const saveMock = jest.fn();
  const model = jest.fn(() => ({ save: saveMock }));
  model.find = jest.fn().mockResolvedValue([]);
  model.findOne = jest.fn();
  model.prototype.save = saveMock;
  return model;
});

jest.mock("../utils/pdfGenerator", () => ({
  generatePrescriptionPDF: jest
    .fn()
    .mockResolvedValue("https://mocked.pdf.url/prescription.pdf"),
}));

jest.mock("firebase-admin/storage", () => ({
  getStorage: () => ({
    bucket: () => ({
      file: () => ({
        save: jest.fn(),
      }),
      name: "mock-bucket",
    }),
  }),
}));

const Appointment = require("../models/Appointment");
const Prescription = require("../models/Prescription");

const mockDoctorId = "64f123456789012345678901";
const mockPatientId = "64f123456789012345678902";

describe("createPrescription", () => {
  beforeEach(() => {
    Appointment.findOne.mockReset();
    Prescription.mockClear();
  });

  it("should return 400 for invalid patient ID", async () => {
    const req = { user: { id: mockDoctorId }, body: { patientId: "bad" } };
    const res = makeRes();
    await createPrescription(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/ID пацієнта/) })
    );
  });

  it("should return 400 if required fields are missing", async () => {
    const req = {
      user: { id: mockDoctorId },
      body: { patientId: mockPatientId },
    };
    const res = makeRes();
    await createPrescription(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/Діагноз і лікування/),
      })
    );
  });

  it("should return 403 if no recent appointment", async () => {
    Appointment.findOne.mockResolvedValue(null);
    const req = {
      user: { id: mockDoctorId },
      body: {
        patientId: mockPatientId,
        diagnosis: "Test",
        treatment: "Test",
        specialResults: "",
        labResults: "",
      },
      files: [],
    };
    const res = makeRes();
    await createPrescription(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/прийому за останній місяць/),
      })
    );
  });
});

describe("getPrescriptionsByPatient", () => {
  it("should return 400 for invalid patient ID", async () => {
    const req = {
      user: { role: "patient", id: "x" },
      params: { patientId: "bad" },
    };
    const res = makeRes();
    await getPrescriptionsByPatient(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should return 403 if patient accesses someone else's prescriptions", async () => {
    const req = {
      user: { role: "patient", id: "id1" },
      params: { patientId: mockPatientId },
    };
    const res = makeRes();
    await getPrescriptionsByPatient(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("getPrescriptionsByDoctor", () => {
  it("should return 400 for invalid doctor ID", async () => {
    const req = {
      user: { role: "doctor", id: mockDoctorId },
      params: { doctorId: "bad" },
    };
    const res = makeRes();
    await getPrescriptionsByDoctor(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should return 403 if doctor accesses someone else's data", async () => {
    const req = {
      user: { role: "doctor", id: "id1" },
      params: { doctorId: mockPatientId },
    };
    const res = makeRes();
    await getPrescriptionsByDoctor(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
