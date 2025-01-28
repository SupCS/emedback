const jwt = require("jsonwebtoken");

const authenticate = (allowedRoles) => {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(" ")[1]; // Отримуємо токен з заголовка

        if (!token) {
            return res.status(401).json({ message: "No token provided." });
        }

        try {
            // Верифікуємо токен
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // Додаємо інформацію про користувача в req

            // Якщо вказано дозволені ролі, перевіряємо роль
            if (allowedRoles && !allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ message: "Access denied." });
            }

            next(); // Пропускаємо запит далі
        } catch (error) {
            res.status(401).json({ message: "Invalid token." });
        }
    };
};

module.exports = authenticate;
