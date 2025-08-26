const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { validate } = require("../middleware/validation");
const Admin = require("../models/Admin");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const eventService = require("../services/eventService");

const router = express.Router();

const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;
// Fail fast with a helpful error if secrets are not loaded
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    "JWT secrets are not configured. Ensure .env contains JWT_SECRET and JWT_REFRESH_SECRET and that dotenv loads before routes."
  );
}

function generateAccessToken(user, role) {
  return jwt.sign({ id: user._id.toString(), role }, JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user, role) {
  return jwt.sign({ id: user._id.toString(), role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

// Zod Schemas
const loginSchema = z.object({
  id: z.string().min(1, "ID is required"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["admin", "faculty", "student"], { message: "Invalid role" }),
});

const registerStudentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

// LOGIN route
router.post("/login", validate(loginSchema), async (req, res) => {
  const { id, password, role } = req.body;

  try {
    let userModel, idField;
    if (role === "admin") {
      userModel = Admin;
      idField = "adminId";
    } else if (role === "faculty") {
      userModel = Faculty;
      idField = "facultyId";
    } else {
      userModel = Student;
      idField = "studentId";
    }

    // Find user by exact id field
    const user = await userModel.findOne({ [idField]: id }).lean(false);
    if (!user) {
      // Avoid user enumeration
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Students must be approved before login
    if (role === "student" && user.isApproved === false) {
      return res.status(403).json({ message: "Student not approved yet" });
    }

    const accessToken = generateAccessToken(user, role);
    const refreshToken = generateRefreshToken(user, role);

    // Store refresh token in a secure, httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({ accessToken, user: { id: user[idField], role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// REGISTER (only for students)
router.post("/register-student", validate(registerStudentSchema), async (req, res) => {
  const { studentId, password } = req.body;
  try {

    const exists = await Student.findOne({ studentId });
    if (exists) return res.status(400).json({ message: "Student already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const student = new Student({ studentId, password: hashed, isApproved: false });
    await student.save();

    // Notify admins in real-time
    eventService.emit("admin-notification", {
      type: "NEW_STUDENT_PENDING_APPROVAL",
      payload: {
        studentId: student.studentId,
        _id: student._id,
      },
    });

    res.status(201).json({ message: "Registered. Awaiting approval." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error registering student" });
  }
});

// REFRESH TOKEN route
router.post("/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    // In a real app, you'd check if the user still exists and is valid
    const accessToken = generateAccessToken({ _id: user.id }, user.role);
    res.json({ accessToken });
  });
});

// LOGOUT route
router.post("/logout", (_req, res) => {
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;
