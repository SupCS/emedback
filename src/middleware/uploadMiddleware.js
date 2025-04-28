const multer = require("multer");

// Налаштовуємо зберігання файлів у оперативній пам'яті
const storage = multer.memoryStorage();

// Фільтр дозволених файлів
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Дозволені лише зображення!"), false);
  }
};

// Створюємо upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Ліміт розміру файлу - 5MB
});

module.exports = upload;
