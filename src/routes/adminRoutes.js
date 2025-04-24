const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const {
  loginAdmin,
  getAdminProfile,
  getAllDoctors,
  getAllPatients,
  getAllAppointments,
  getAllPrescriptions,
  addDoctor,
  blockDoctor,
  unblockDoctor,
  blockPatient,
  unblockPatient,
  deleteDoctor,
  adminUpdateDoctor,
  adminUpdatePatient,
  adminCancelAppointment,
  getAdminStats,
} = require("../controllers/adminController");

router.post("/login", loginAdmin);
router.get("/profile", authenticate(["admin"]), getAdminProfile);
router.get("/doctors", authenticate(["admin"]), getAllDoctors);
router.get("/patients", authenticate(["admin"]), getAllPatients);
router.get("/appointments", authenticate(["admin"]), getAllAppointments);
router.get("/prescriptions", authenticate(["admin"]), getAllPrescriptions);
router.post("/doctors", authenticate(["admin"]), addDoctor);
router.delete("/doctors/:id", authenticate(["admin"]), deleteDoctor);
router.patch("/doctors/:id/block", authenticate(["admin"]), blockDoctor);
router.patch("/doctors/:id/unblock", authenticate(["admin"]), unblockDoctor);
router.patch("/patients/:id/block", authenticate(["admin"]), blockPatient);
router.patch("/patients/:id/unblock", authenticate(["admin"]), unblockPatient);
router.patch("/doctors/:id", authenticate(["admin"]), adminUpdateDoctor);
router.patch("/patients/:id", authenticate(["admin"]), adminUpdatePatient);
router.patch(
  "/appointments/:id/cancel",
  authenticate(["admin"]),
  adminCancelAppointment
);
router.get("/stats", authenticate(["admin"]), getAdminStats);

module.exports = router;
