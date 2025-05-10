// src/tests/appointmentValidation.test.js
const { describe, it, expect } = require("@jest/globals");

function isValidStatus(status) {
  return ["confirmed", "cancelled"].includes(status);
}

function isValidCancelReason(reason) {
  return (
    typeof reason === "string" && reason.length >= 5 && reason.length <= 100
  );
}

function isSlotAvailable(slots, startTime, endTime) {
  return slots.some(
    (slot) => slot.startTime === startTime && slot.endTime === endTime
  );
}

describe("Appointment Validation Utils", () => {
  describe("Status Validation", () => {
    it("should accept valid status 'confirmed'", () => {
      expect(isValidStatus("confirmed")).toBe(true);
    });

    it("should reject invalid status 'done'", () => {
      expect(isValidStatus("done")).toBe(false);
    });
  });

  describe("Cancel Reason Validation", () => {
    it("should accept reason within length bounds", () => {
      expect(isValidCancelReason("пацієнт не зміг прийти")).toBe(true);
    });

    it("should reject too short reason", () => {
      expect(isValidCancelReason("1234")).toBe(false);
    });

    it("should reject too long reason", () => {
      const longReason = "а".repeat(101);
      expect(isValidCancelReason(longReason)).toBe(false);
    });
  });

  describe("Slot Availability", () => {
    const slots = [
      { startTime: "10:00", endTime: "10:30" },
      { startTime: "11:00", endTime: "11:30" },
    ];

    it("should detect available slot", () => {
      expect(isSlotAvailable(slots, "10:00", "10:30")).toBe(true);
    });

    it("should return false if slot not available", () => {
      expect(isSlotAvailable(slots, "12:00", "12:30")).toBe(false);
    });
  });
});
