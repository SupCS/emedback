const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "EMed API Documentation",
            version: "1.0.0",
            description: "Документація для API платформи EMed",
        },
        servers: [
            {
                url: "http://localhost:5000", // Базовий URL бекенду
            },
        ],
    },
    apis: ["./src/routes/*.js"], // Шлях до всіх файлів з маршрутами
};

const swaggerSpec = swaggerJsDoc(options);

const swaggerDocs = (app) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = swaggerDocs;