const mongoose = require("mongoose");
const dotenv = require("dotenv");
const readline = require("readline");
const bcrypt = require("bcrypt");
const Doctor = require("../models/Doctor");

dotenv.config();

// Підключення до бази даних
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

// Створення інтерфейсу для вводу даних
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const askQuestion = (query) => {
    return new Promise((resolve) => rl.question(query, resolve));
};

const addDoctor = async () => {
    try {
        console.log(
            "Please provide the following information to create a new doctor:"
        );

        const name = await askQuestion("Name: ");
        const email = await askQuestion("Email: ");
        const password = await askQuestion("Password (will be hashed): ");
        const phone = await askQuestion("Phone: ");
        const specialization = await askQuestion("Specialization: ");
        const experience = await askQuestion("Years of Experience: ");
        const bio = await askQuestion("Bio: ");

        // Хешуємо пароль
        const hashedPassword = await bcrypt.hash(password, 10); // Сіль = 10

        // Створюємо нового лікаря
        const doctor = new Doctor({
            name,
            email,
            password: hashedPassword,
            phone,
            specialization,
            experience,
            bio,
        });

        await doctor.save();
        console.log(`Doctor ${name} has been added successfully!`);

        // Закриваємо інтерфейс і підключення до бази
        rl.close();
        mongoose.connection.close();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        rl.close();
        mongoose.connection.close();
    }
};

// Підключаємося до бази та запускаємо функцію
connectDB().then(() => addDoctor());
