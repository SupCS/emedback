const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Функція для генерації вкладених директорій
const generateStoragePath = () => {
  const dir1 = Math.random().toString(36).substring(2, 4); // Перші 2 символи
  const dir2 = Math.random().toString(36).substring(2, 4); // Другі 2 символи
  return path.join(__dirname, "../uploads", dir1, dir2);
};

// Переконуємося, що директорія існує
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true }); // Створюємо вкладені папки
  }
};

// Налаштування Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const storagePath = generateStoragePath();
    ensureDirectoryExists(storagePath);
    cb(null, storagePath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, fileName);
  },
});

// Фільтр дозволених файлів
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Дозволені лише зображення!"), false);
  }
};

// Налаштування Multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Максимальний розмір файлу - 5MB
});

module.exports = upload;
