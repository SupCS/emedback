const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const Doctor = require("../models/Doctor");

dotenv.config();

const doctorsData = [
  {
    name: "Serhii Melnyk",
    email: "serhii.melnyk@healthcare.ua",
  },
  {
    name: "Kateryna Boyko",
    email: "kateryna.boyko@healthcare.ua",
  },
  {
    name: "Andriy Melnyk",
    email: "andriy.melnyk@medicline.com",
  },
  {
    name: "Dmytro Kovalchuk",
    email: "dmytro.kovalchuk@medicline.com",
  },
  {
    name: "Kateryna Moroz",
    email: "kateryna.moroz@clinic24.net",
  },
  {
    name: "Nadiia Kravchenko",
    email: "nadiia.kravchenko@clinic24.net",
  },
  {
    name: "Oksana Bondarenko",
    email: "oksana.bondarenko@medicline.com",
  },
  {
    name: "Olena Boyko",
    email: "olena.boyko@medicline.com",
  },
  {
    name: "Kateryna Kovalenko",
    email: "kateryna.kovalenko@doctors.org",
  },
  {
    name: "Andriy Moroz",
    email: "andriy.moroz@healthcare.ua",
  },
];

const specializations = [
  "Кардіолог",
  "Дерматолог",
  "Педіатр",
  "Хірург",
  "Офтальмолог",
  "Невролог",
  "Онколог",
  "Стоматолог",
  "Терапевт",
  "Психіатр",
];

const bios = [
  "Досвідчений фахівець, який працює для покращення життя пацієнтів.",
  "Професіонал з багаторічним досвідом у своїй сфері.",
  "Прагну забезпечити найкращий рівень медичної допомоги.",
  "Маю великий досвід роботи з пацієнтами різного віку.",
  "Завжди відкрита до нових підходів у лікуванні та діагностиці.",
];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error(`❌ DB connection error: ${error.message}`);
    process.exit(1);
  }
};

const seedDoctors = async () => {
  try {
    for (let i = 0; i < doctorsData.length; i++) {
      const base = doctorsData[i];
      const hashedPassword = await bcrypt.hash("password123", 10);
      const doctor = new Doctor({
        ...base,
        password: hashedPassword,
        phone: `+380${Math.floor(100000000 + Math.random() * 900000000)}`,
        specialization: specializations[i % specializations.length],
        experience: Math.floor(Math.random() * 30) + 1,
        bio: bios[i % bios.length],
        avatar: null,
      });

      await doctor.save();
      console.log(`✅ Created doctor: ${doctor.name}`);
    }
    console.log("🎉 Усі лікарі успішно додані.");
    mongoose.connection.close();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    mongoose.connection.close();
  }
};

connectDB().then(seedDoctors);
