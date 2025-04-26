const rateLimit = require("express-rate-limit");

// Ліміт для авторизації та реєстрації
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 хвилин
  max: 10, // максимум 10 запитів за 5 хвилин
  message: {
    message: "Забагато спроб. Будь ласка, спробуйте пізніше.",
  },
  standardHeaders: true, // Відправляти стандартні заголовки rate limit
  legacyHeaders: false, // Не використовувати застарілі заголовки
});

// Загальний ліміт для всього API
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 хвилина
  max: 100, // максимум 100 запитів за хвилину
  message: {
    message: "Забагато запитів. Зачекайте трохи.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, generalLimiter };
