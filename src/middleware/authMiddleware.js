const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Отримуємо токен з заголовка

    if (!token) {
        return res.status(401).json({ message: "No token provided." });
    }

    try {
        // Верифікуємо токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Додаємо інформацію про користувача в req
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token." });
    }
};

module.exports = authenticate;
