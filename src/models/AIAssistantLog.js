const mongoose = require("mongoose");

const AIAssistantLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "userRole",
    },
    userRole: {
      type: String,
      enum: ["Doctor", "Patient"],
      required: true,
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ["user", "ai"],
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("AIAssistantLog", AIAssistantLogSchema);
