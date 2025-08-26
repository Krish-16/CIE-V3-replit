const mongoose = require("mongoose");

const DepartmentSchema = new mongoose.Schema(
  {
    did: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    hod: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// Ensure uniqueness while allowing existing documents without these fields
DepartmentSchema.index(
  { did: 1 },
  { unique: true, partialFilterExpression: { did: { $type: "string" } } }
);

DepartmentSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { name: { $type: "string" } } }
);

module.exports = mongoose.model("Department", DepartmentSchema);
