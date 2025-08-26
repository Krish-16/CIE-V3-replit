const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  // New fields to manage students without relying on Class reference
  // Stores department code (DID) e.g., "CSE"
  department: {
    type: String,
    trim: true,
    default: null,
  },
  // Stores semester number (1-8)
  semester: {
    type: Number,
    min: 1,
    max: 8,
    default: null,
  },
  // Admission academic year, e.g., "2023-24"
  admissionYear: {
    type: String,
    trim: true,
    default: null,
  },
  // Roll number within the batch (not necessarily globally unique)
  rollNumber: {
    type: String,
    trim: true,
    default: null,
  },
  // Derived academic year (1..N) at creation time based on admissionYear
  currentYear: {
    type: Number,
    min: 1,
    default: null,
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null,
  },
  assignedFaculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty"
  }
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);
