const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const routes = require("./routes");
const { generalLimiter } = require("./middleware/rateLimiter");
const swaggerDocs = require("./config/swagger");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://emedasparian.netlify.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use("/", routes);
app.use(generalLimiter);

// Swagger
swaggerDocs(app);

module.exports = app;
