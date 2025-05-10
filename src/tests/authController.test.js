// src/tests/authValidation.test.js
const { describe, it, expect } = require("@jest/globals");

function isValidRegistration({ name, email, password }) {
  return Boolean(name && email && password);
}

function isValidLogin({ email, password }) {
  return Boolean(email && password);
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

describe("Auth Validation Utils", () => {
  describe("Registration Input", () => {
    it("should return true for valid data", () => {
      const valid = isValidRegistration({
        name: "John",
        email: "john@example.com",
        password: "123456",
      });
      expect(valid).toBe(true);
    });

    it("should return false if email is missing", () => {
      const valid = isValidRegistration({ name: "John", password: "123456" });
      expect(valid).toBe(false);
    });
  });

  describe("Login Input", () => {
    it("should return true for valid login data", () => {
      const valid = isValidLogin({
        email: "user@example.com",
        password: "password",
      });
      expect(valid).toBe(true);
    });

    it("should return false if password is missing", () => {
      const valid = isValidLogin({ email: "user@example.com" });
      expect(valid).toBe(false);
    });
  });

  describe("Email Normalization", () => {
    it("should trim and lowercase email", () => {
      const input = "  John@Example.COM ";
      const result = normalizeEmail(input);
      expect(result).toBe("john@example.com");
    });

    it("should return empty string if input is not a string", () => {
      const result = normalizeEmail(null);
      expect(result).toBe("");
    });
  });
});
