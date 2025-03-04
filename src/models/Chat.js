const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "participantModel", // Динамічний зв'язок (Doctor або Patient)
      required: true,
    },
  ],
  participantModel: [
    {
      type: String,
      enum: ["Doctor", "Patient"],
      required: true,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;
