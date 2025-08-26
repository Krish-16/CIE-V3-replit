// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
// Note: express-mongo-sanitize mutates req.query which is read-only in Express 5.
// We'll use a small custom sanitizer for body/params only.

// Load env
const path = require("path");
try {
  // Ensure .env is loaded from the backend directory regardless of process.cwd()
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {}

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/";
const DB_NAME = process.env.DB_NAME || "cie";

// Security & core middleware
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

// Custom sanitizer: strip keys starting with $ or containing . from objects
function deepSanitize(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) obj[i] = deepSanitize(obj[i]);
    return obj;
  }
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else {
      obj[key] = deepSanitize(obj[key]);
    }
  }
  return obj;
}

app.use((req, _res, next) => {
  if (req.body) req.body = deepSanitize(req.body);
  if (req.params) req.params = deepSanitize(req.params);
  // Do NOT touch req.query (read-only in Express 5)
  next();
});

// Rate limit for auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });

// Connect DB
mongoose
  .connect(MONGO_URI, { dbName: DB_NAME })
  .then(() => console.log("🟢 MongoDB connected"))
  .catch((err) => { console.error("🔴 MongoDB connection error:", err); process.exit(1); });

// Routes
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/admin", adminRoutes);

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
