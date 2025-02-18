const mongoose = require("mongoose");

const DoctorScheduleSchema = new mongoose.Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true, unique: true },
    availability: [
        {
            date: { type: String, required: true }, // YYYY-MM-DD
            slots: [
                {
                    startTime: { type: String, required: true }, // HH:mm
                    endTime: { type: String, required: true } // HH:mm
                }
            ]
        }
    ]
});

const DoctorSchedule = mongoose.model("DoctorSchedule", DoctorScheduleSchema);

module.exports = DoctorSchedule;
