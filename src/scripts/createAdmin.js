const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error(`❌ DB connection error: ${error.message}`);
    process.exit(1);
  }
};

const createAdmin = async () => {
  try {
    const existing = await Admin.findOne({ email: "admin@example.com" });
    if (existing) {
      console.log("⚠️ Admin already exists.");
      mongoose.connection.close();
      return;
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = new Admin({
      name: "Super Admin",
      email: "admin@example.com",
      password: hashedPassword,
    });

    await admin.save();
    console.log("🎉 Admin created successfully!");
    mongoose.connection.close();
  } catch (error) {
    console.error(`❌ Error creating admin: ${error.message}`);
    mongoose.connection.close();
  }
};

connectDB().then(createAdmin);
