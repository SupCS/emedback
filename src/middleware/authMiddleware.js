const jwt = require("jsonwebtoken");

const authenticate = (allowedRoles) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Токен не надано." });
    }

    try {
      // Верифікуємо токен
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      // Якщо вказано дозволені ролі, перевіряємо роль
      if (allowedRoles && !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Доступ заборонено." });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Недійсний токен." });
    }
  };
};

module.exports = authenticate;
