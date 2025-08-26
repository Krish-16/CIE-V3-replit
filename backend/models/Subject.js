// models/Subject.js
const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  classId: { type: String, required: true }, // The class this subject belongs to
});

module.exports = mongoose.model("Subject", SubjectSchema);
