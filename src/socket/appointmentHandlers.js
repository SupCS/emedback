const { users } = require("./state");

module.exports = (socket, io) => {
  socket.on("appointmentRequest", ({ doctorId, appointment }) => {
    if (!doctorId || !appointment) {
      console.error("appointmentRequest: Невалідні дані");
      return;
    }

    const doctorSockets = users.get(doctorId);
    if (doctorSockets) {
      for (const socketId of doctorSockets) {
        io.to(socketId).emit("newAppointmentRequest", appointment);
      }
      console.log(`Відправлено newAppointmentRequest лікарю ${doctorId}`);
    } else {
      console.warn(`Лікаря ${doctorId} немає онлайн`);
    }
  });

  socket.on("appointmentStatusUpdate", ({ patientId, appointment }) => {
    if (!patientId || !appointment) {
      console.error("appointmentStatusUpdate: Невалідні дані");
      return;
    }

    const patientSockets = users.get(patientId);
    if (patientSockets) {
      for (const socketId of patientSockets) {
        io.to(socketId).emit("appointmentStatusChanged", appointment);
      }
      console.log(`Відправлено appointmentStatusChanged пацієнту ${patientId}`);
    } else {
      console.warn(`Пацієнта ${patientId} немає онлайн`);
    }
  });
};
