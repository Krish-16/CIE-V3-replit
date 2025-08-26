const express = require("express");
const bcrypt = require("bcryptjs");
const { authenticate, requireRole } = require("../middleware/auth");
const { logAction } = require("../services/auditService");
const { z } = require("zod");
const { validate } = require("../middleware/validation");
const eventService = require("../services/eventService");
const multer = require("multer");
const exceljs = require("exceljs");

// MODELS
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const Department = require("../models/Department");
const AuditLog = require("../models/AuditLog");
const Exam = require("../models/Exam");

const router = express.Router();
const adminOnly = [authenticate, requireRole("admin")];

// Zod Schemas for Admin Routes
const departmentSchema = z.object({
  did: z.string().trim().min(1, "Department ID is required"),
  name: z.string().trim().min(1, "Department name is required"),
  hod: z.string().trim().min(1, "HOD is required"),
});

const facultySchema = z.object({
  facultyId: z.string().min(1),
  name: z.string().min(1),
  department: z.string().min(1),
  password: z.string().min(6),
});

// Class schemas
const createClassSchema = z.object({
  department: z.string().min(1),
  className: z.string().min(1),
  termYear: z.string().min(4),
  oddEven: z.enum(['Odd', 'Even']),
  semester: z.coerce.number().int().min(1).max(8),
});

const updateClassSchema = z.object({
  department: z.string().min(1).optional(),
  className: z.string().min(1).optional(),
  termYear: z.string().min(4).optional(),
  oddEven: z.enum(['Odd', 'Even']).optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
});

const subjectSchema = z.object({
    name: z.string().min(1),
    classId: z.string().min(1),
});

const studentApprovalSchema = z.object({
    approve: z.boolean(),
});

const assignFacultySchema = z.object({
    facultyId: z.string().min(1),
    classId: z.string().min(1),
    semester: z.number().int(),
});

const enrollStudentSchema = z.object({
    classId: z.string().min(1, "Class ID is required"),
});

// Allow updating student meta without class: department (DID)
const updateStudentSchema = z.object({
  name: z.string().trim().min(1).optional(),
  department: z.string().trim().min(1).optional(), // DID code (e.g., CSE)
  semester: z.coerce.number().int().min(1).max(8).optional(),
  password: z.string().min(6).optional(),
  // Optional identifiers and profile fields
  studentId: z.string().trim().min(1).optional(),
  admissionYear: z.string().trim().min(4).optional(), // e.g., "2023" or "2023-24"
  rollNumber: z.string().trim().min(1).optional(),
  currentYear: z.coerce.number().int().min(1).max(10).optional(),
});

// Create student schema
const createStudentSchema = z.object({
  studentId: z.string().trim().min(1, "Student ID is required"),
  name: z.string().trim().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  department: z.string().trim().min(1).optional(),
  admissionYear: z.string().trim().min(4).optional(),
  rollNumber: z.string().trim().min(1).optional(),
  currentYear: z.coerce.number().int().min(1).max(10).optional(),
  isApproved: z.boolean().optional(),
});

// Multer config for in-memory file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helpers
function getPaging(req) {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// ---------- STATS & ANALYTICS ----------
router.get("/stats", adminOnly, async (_req, res) => {
  try {
    const [
      totalStudents,
      totalFaculty,
      totalDepartments,
      totalClasses,
      pendingStudents,
      totalExams,
      activeExams,
      completedExams,
      // Aggregate faculty count by department
      facultyByDept,
      // Aggregate class count by department
      classesByDept,
    ] = await Promise.all([
      Student.countDocuments(),
      Faculty.countDocuments(),
      Department.countDocuments(),
      Class.countDocuments(),
      Student.countDocuments({ isApproved: false }),
      Exam.countDocuments(),
      Exam.countDocuments({ status: "Ongoing" }),
      Exam.countDocuments({ status: "Completed" }),
      Faculty.aggregate([
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $project: { department: "$_id", count: 1, _id: 0 } },
        { $sort: { department: 1 } },
      ]),
      Class.aggregate([
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $project: { department: "$_id", count: 1, _id: 0 } },
        { $sort: { department: 1 } },
      ]),
    ]);

    res.json({
      totalStudents,
      totalFaculty,
      totalDepartments,
      totalClasses,
      totalExams,
      activeExams,
      completedExams,
      pendingApprovals: pendingStudents,
      facultyByDepartment: facultyByDept,
      classesByDepartment: classesByDept,
    });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ message: "Error fetching statistics" });
  }
});

// ---------- DEPARTMENTS ----------
router.get("/departments", adminOnly, async (_req, res) => {
  try {
    const docs = await Department.find().select("did name hod").lean();
    const departments = docs.map((d) => ({ id: d._id, ...d }));
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: "Error fetching departments" });
  }
});

router.post("/departments", [adminOnly, validate(departmentSchema)], async (req, res) => {
  let { did, name, hod } = req.body;
  try {
    did = did.toString().trim().toUpperCase();
    name = name.toString().trim();
    hod = hod.toString().trim();

    const [existsDid, existsName] = await Promise.all([
      Department.findOne({ did }),
      Department.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } }),
    ]);
    if (existsDid) return res.status(400).json({ message: "Department ID already exists" });
    if (existsName) return res.status(400).json({ message: "Department name already exists" });

    const newDepartment = new Department({ did, name, hod });
    await newDepartment.save();
    await logAction(req.user.id, 'CREATE_DEPARTMENT', { departmentId: newDepartment._id, did, name, hod });
    res.status(201).json(newDepartment);
  } catch (err) {
    console.error('Create Department Error:', err);
    res.status(500).json({ message: "Error creating department" });
  }
});

// Update department
router.put("/departments/:id", [adminOnly, validate(departmentSchema)], async (req, res) => {
  let { did, name, hod } = req.body;
  try {
    did = did.toString().trim().toUpperCase();
    name = name.toString().trim();
    hod = hod.toString().trim();

    const [conflictDid, conflictName] = await Promise.all([
      Department.findOne({ _id: { $ne: req.params.id }, did }),
      Department.findOne({ _id: { $ne: req.params.id }, name: { $regex: new RegExp(`^${name}$`, 'i') } }),
    ]);
    if (conflictDid) return res.status(400).json({ message: "Another department with this ID already exists" });
    if (conflictName) return res.status(400).json({ message: "Another department with this name already exists" });

    const updated = await Department.findByIdAndUpdate(
      req.params.id,
      { did, name, hod },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Department not found" });
    await logAction(req.user.id, 'UPDATE_DEPARTMENT', { departmentId: updated._id, did: updated.did, name: updated.name, hod: updated.hod });
    res.json(updated);
  } catch (err) {
    console.error('Update Department Error:', err);
    res.status(500).json({ message: "Error updating department" });
  }
});

// Delete department
router.delete("/departments/:id", adminOnly, async (req, res) => {
  try {
    const deleted = await Department.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Department not found" });
    try {
      await logAction(req.user.id, 'DELETE_DEPARTMENT', { departmentId: deleted._id, name: deleted.name });
    } catch (_) { /* swallow log errors */ }
    res.json({ message: "Department deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting department" });
  }
});

// ---------- FACULTY ----------
router.get("/faculty", adminOnly, async (req, res) => {
  const { q, department } = req.query;
  const { limit, skip, page } = getPaging(req);
  const filter = {};
  if (department) filter.department = department.toString().toUpperCase().trim();
  if (q) filter.$or = [
    { facultyId: { $regex: q, $options: "i" } },
    { name: { $regex: q, $options: "i" } },
  ];
  try {
    const [items, total] = await Promise.all([
      Faculty.find(filter).select("facultyId name department").skip(skip).limit(limit).lean(),
      Faculty.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  } catch (err) {
    res.status(500).json({ message: "Error fetching faculty" });
  }
});

router.post("/faculty", [adminOnly, validate(facultySchema)], async (req, res) => {
  const { facultyId, name, department, password } = req.body;
  try {
    const exists = await Faculty.findOne({ facultyId });
    if (exists) return res.status(400).json({ message: "Faculty with this ID already exists" });
    const hashed = await bcrypt.hash(password, 10);
    const newFaculty = new Faculty({ facultyId, name, department: department.toUpperCase().trim(), password: hashed });
    await newFaculty.save();
    await logAction(req.user.id, 'CREATE_FACULTY', { facultyId: newFaculty._id, name });
    res.status(201).json({ message: "Faculty created" });
  } catch (err) {
    res.status(500).json({ message: "Error creating faculty" });
  }
});

router.put("/faculty/:id", adminOnly, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.department) update.department = update.department.toUpperCase().trim();
    if (update.password) update.password = await bcrypt.hash(update.password, 10);
    const updated = await Faculty.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ message: "Faculty not found" });
    await logAction(req.user.id, 'UPDATE_FACULTY', { facultyId: updated._id, name: updated.name });
    res.json({ message: "Faculty updated" });
  } catch (err) {
    res.status(500).json({ message: "Error updating faculty" });
  }
});

router.delete("/faculty/:id", adminOnly, async (req, res) => {
  try {
    const deleted = await Faculty.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Faculty not found" });
    try {
      await logAction(req.user.id, 'DELETE_FACULTY', { facultyId: deleted._id, name: deleted.name });
    } catch (_) { /* swallow log errors */ }
    res.json({ message: "Faculty deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting faculty" });
  }
});

// ---------- STUDENTS ----------
router.get("/students", adminOnly, async (req, res) => {
  const { q, approved } = req.query;
  const { limit, skip, page } = getPaging(req);
  const filter = {};
  if (approved === "true") filter.isApproved = true;
  if (approved === "false") filter.isApproved = false;
  if (q) filter.studentId = { $regex: q, $options: "i" };
  try {
    const [items, total] = await Promise.all([
      Student.find(filter).skip(skip).limit(limit).lean(),
      Student.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  } catch (err) {
    res.status(500).json({ message: "Error fetching students" });
  }
});

// Create a single student (manual entry)
router.post("/students", [adminOnly, validate(createStudentSchema)], async (req, res) => {
  try {
    const { studentId, name, password, department, admissionYear, rollNumber, currentYear, isApproved } = req.body;
    const doc = {
      studentId: studentId.toString().trim(),
      name: name.toString().trim(),
      password: await bcrypt.hash(password, 10),
      isApproved: typeof isApproved === 'boolean' ? isApproved : true, // Admin-created students are approved by default
      department: department ? department.toString().toUpperCase().trim() : null,
      admissionYear: admissionYear ? admissionYear.toString().trim() : null,
      rollNumber: (rollNumber ? rollNumber.toString().trim() : studentId.toString().trim()),
      currentYear: Number.isFinite(+currentYear) ? +currentYear : null,
    };
    // Derive currentYear if not provided but admissionYear present
    if (!doc.currentYear && doc.admissionYear) {
      const match = doc.admissionYear.match(/(\d{4})/);
      if (match) {
        const startYear = parseInt(match[1], 10);
        if (startYear >= 1900 && startYear <= 2100) {
          const nowYear = new Date().getFullYear();
          doc.currentYear = Math.max(1, nowYear - startYear + 1);
        }
      }
    }

    const newStudent = new Student(doc);
    await newStudent.save();
    try {
      await logAction(req.user.id, 'CREATE_STUDENT', { studentId: newStudent._id, studentNo: newStudent.studentId });
    } catch (_) { /* ignore log errors */ }
    res.status(201).json({ message: "Student created", id: newStudent._id });
  } catch (err) {
    console.error('Create Student Error:', err);
    if (err && (err.code === 11000 || err.code === 'E11000')) {
      return res.status(409).json({ message: "Student ID already exists" });
    }
    res.status(500).json({ message: "Error creating student" });
  }
});

router.patch("/students/:id/approve", [adminOnly, validate(studentApprovalSchema)], async (req, res) => {
  const { approve } = req.body;
  try {
    const updated = await Student.findByIdAndUpdate(req.params.id, { isApproved: !!approve });
    if (!updated) return res.status(404).json({ message: "Student not found" });
    await logAction(req.user.id, 'APPROVE_STUDENT', { studentId: updated._id, approved: !!approve });
    res.json({ message: "Student approval updated" });
  } catch (err) {
    res.status(500).json({ message: "Error updating approval" });
  }
});

router.delete("/students/:id", adminOnly, async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Student not found" });
    try {
      await logAction(req.user.id, 'DELETE_STUDENT', { studentId: deleted._id, studentNo: deleted.studentId });
    } catch (_) { /* swallow log errors */ }
    res.json({ message: "Student deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting student" });
  }
});

// Update student details (department/semester/name/password)
router.put("/students/:id", [adminOnly, validate(updateStudentSchema)], async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.department) update.department = update.department.toString().toUpperCase().trim();
    if (update.password) update.password = await bcrypt.hash(update.password, 10);
    const updated = await Student.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ message: "Student not found" });
    await logAction(req.user.id, 'UPDATE_STUDENT', { studentId: updated._id, fields: Object.keys(req.body) });
    res.json({ message: "Student updated" });
  } catch (err) {
    console.error('Update Student Error:', err);
    if (err && (err.code === 11000 || err.code === 'E11000')) {
      return res.status(409).json({ message: "Student ID already exists" });
    }
    res.status(500).json({ message: "Error updating student" });
  }
});

// ---------- CLASSES ----------
router.get("/classes", adminOnly, async (req, res) => {
  try {
    const { department, status, q } = req.query;
    const filter = {};
    if (department) filter.department = department.toString().toUpperCase().trim();
    if (status) filter.status = status.toString().trim();
    if (q) {
      filter.$or = [
        { classId: { $regex: q, $options: "i" } },
        { className: { $regex: q, $options: "i" } },
      ];
    }
    const classes = await Class.find(filter).lean();
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching classes" });
  }
});

// Helpers for classId generation
function slugify(value) {
  return value
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateUniqueClassId({ department, className, semester, excludeId = null }) {
  const dept = department.toString().toUpperCase().trim();
  const base = `${dept}-${slugify(className)}-S${String(semester)}`;
  let candidate = base;
  let suffix = 0;
  // Ensure uniqueness for (classId, semester)
  // Note: we check candidate with exact semester
  // and add numeric suffix if collision
  // Exclude current document when updating
  const conflictQuery = (cid) => excludeId
    ? { classId: cid, semester, _id: { $ne: excludeId } }
    : { classId: cid, semester };
  while (await Class.findOne(conflictQuery(candidate))) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

router.post("/classes", [adminOnly, validate(createClassSchema)], async (req, res) => {
  try {
    let { department, className, termYear, oddEven, semester } = req.body;
    department = department.toString().toUpperCase().trim();
    className = className.toString().trim();
    termYear = termYear.toString().trim();
    oddEven = oddEven.toString();
    // Enforce odd/even parity
    const isOdd = semester % 2 === 1;
    if ((oddEven === 'Odd' && !isOdd) || (oddEven === 'Even' && isOdd)) {
      return res.status(400).json({ message: "Semester does not match Odd/Even selection" });
    }

    // Build display className as `<baseName> - <Department Name>` (fallback to code)
    const deptDoc = await Department.findOne({ did: department }).lean();
    const displayName = `${className} - ${deptDoc?.name || department}`;
    const classId = await generateUniqueClassId({ department, className, semester });
    const newClass = new Class({ department, className: displayName, classId, termYear, semester, oddEven, facultyId: null });
    await newClass.save();
    await logAction(req.user.id, 'CREATE_CLASS', { classId: newClass._id, className });
    res.status(201).json(newClass);
  } catch (err) {
    console.error('Create Class Error:', err);
    res.status(500).json({ message: "Error creating class" });
  }
});

router.put("/classes/:id", [adminOnly, validate(updateClassSchema)], async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const update = { ...req.body };
    if (update.department) update.department = update.department.toString().toUpperCase().trim();
    if (update.className) update.className = update.className.toString().trim();
    if (update.termYear) update.termYear = update.termYear.toString().trim();

    // If department/className/semester changed, regenerate classId to keep consistency
    const dep = update.department ?? cls.department;
    // Determine base class name by stripping trailing department suffix if present
    const prevDeptDoc = await Department.findOne({ did: cls.department }).lean();
    const prevDeptName = prevDeptDoc?.name || cls.department;
    const incomingName = update.className ?? cls.className;
    let baseName = incomingName;
    const suffixesToStrip = [` - ${prevDeptName}`, ` - ${cls.department}`];
    for (const suf of suffixesToStrip) {
      if (baseName?.endsWith(suf)) {
        baseName = baseName.slice(0, -suf.length);
        break;
      }
    }
    const name = baseName;
    const sem = update.semester ?? cls.semester;
    const shouldRegenerate = (
      dep !== cls.department ||
      name !== cls.className ||
      sem !== cls.semester
    );
    if (shouldRegenerate) {
      const regeneratedId = await generateUniqueClassId({ department: dep, className: name, semester: sem, excludeId: cls._id });
      update.classId = regeneratedId;
    }

    // Enforce odd/even parity if oddEven/semester present
    const oddEven = update.oddEven ?? cls.oddEven;
    const isOdd = (update.semester ?? cls.semester) % 2 === 1;
    if ((oddEven === 'Odd' && !isOdd) || (oddEven === 'Even' && isOdd)) {
      return res.status(400).json({ message: "Semester does not match Odd/Even selection" });
    }

    // Re-append current/new department name to className for display
    const newDeptDoc = await Department.findOne({ did: dep }).lean();
    const newDeptName = newDeptDoc?.name || dep;
    const finalDisplayName = `${name} - ${newDeptName}`;
    update.className = finalDisplayName;

    const updated = await Class.findByIdAndUpdate(req.params.id, update, { new: true });
    await logAction(req.user.id, 'UPDATE_CLASS', { classId: updated._id, className: updated.className });
    res.json(updated);
  } catch (err) {
    console.error('Update Class Error:', err);
    res.status(500).json({ message: "Error updating class" });
  }
});

router.delete("/classes/:id", adminOnly, async (req, res) => {
  try {
    const deleted = await Class.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Class not found" });
    try {
      await logAction(req.user.id, 'DELETE_CLASS', { classId: deleted._id, className: deleted.className });
    } catch (_) { /* swallow log errors */ }
    res.json({ message: "Class deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting class" });
  }
});

// End a class (mark as Ended without deleting)
router.patch("/classes/:id/end", adminOnly, async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    if (cls.status === 'Ended') {
      return res.status(400).json({ message: "Class already ended" });
    }
    cls.status = 'Ended';
    cls.endedAt = new Date();
    await cls.save();
    try {
      await logAction(req.user.id, 'END_CLASS', { classId: cls._id, className: cls.className });
      eventService.emit("admin-notification", { type: 'CLASS_ENDED', classId: String(cls._id), className: cls.className, timestamp: Date.now() });
    } catch (_) { /* ignore */ }
    res.json({ message: "Class ended", class: cls });
  } catch (err) {
    console.error('End Class Error:', err);
    res.status(500).json({ message: "Error ending class" });
  }
});

// Assign faculty to class
router.post("/assign-faculty-to-class", [adminOnly, validate(assignFacultySchema)], async (req, res) => {
  const { facultyId, classId, semester } = req.body;
  try {
    const faculty = await Faculty.findOne({ facultyId });
    const cls = await Class.findOne({ classId, semester });
    if (!faculty || !cls) return res.status(404).json({ message: "Faculty or Class not found" });
    cls.facultyId = faculty._id;
    await cls.save();
    await logAction(req.user.id, 'ASSIGN_FACULTY_TO_CLASS', { classId: cls._id, facultyId: faculty._id });
    res.json({ message: "Faculty assigned to class" });
  } catch (err) {
    res.status(500).json({ message: "Error assigning faculty" });
  }
});

// ---------- SUBJECTS ----------
router.get("/subjects", adminOnly, async (req, res) => {
  try {
    const { classId } = req.query;
    const filter = {};
    if (classId) filter.classId = classId.toString().trim();
    const subjects = await Subject.find(filter).lean();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: "Error fetching subjects" });
  }
});

router.post("/subjects", [adminOnly, validate(subjectSchema)], async (req, res) => {
  const { name, classId } = req.body;
  try {
    const subject = new Subject({ name, classId });
    await subject.save();
    await logAction(req.user.id, 'CREATE_SUBJECT', { subjectId: subject._id, name });
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ message: "Error creating subject" });
  }
});

router.put("/subjects/:id", adminOnly, async (req, res) => {
  try {
    const updated = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Subject not found" });
    await logAction(req.user.id, 'UPDATE_SUBJECT', { subjectId: updated._id, name: updated.name });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error updating subject" });
  }
});

router.delete("/subjects/:id", adminOnly, async (req, res) => {
  try {
    const deleted = await Subject.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Subject not found" });
    try {
      await logAction(req.user.id, 'DELETE_SUBJECT', { subjectId: deleted._id, name: deleted.name });
    } catch (_) { /* swallow log errors */ }
    res.json({ message: "Subject deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting subject" });
  }
});

// ---------- BULK OPERATIONS ----------
router.post("/bulk/students", adminOnly, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  const workbook = new exceljs.Workbook();
  try {
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];
    const bulkOps = [];

    const totalRows = Math.max(worksheet.rowCount - 1, 0);
    let processed = 0;
    let skipped = 0;

    // Using a for loop to handle async operations correctly
    // Expected columns: [1] Student ID, [2] Name, [3] Department ID, [4] Admission Year, [5] Roll Number, [6] Password
    // Notes: Department column accepts Department ID (preferred) or Department Name.
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const studentId = row.getCell(1).value;
      const name = row.getCell(2).value;
      const departmentCell = row.getCell(3).value; // accepts DID or Department Name
      const admissionYearCell = row.getCell(4).value;
      const rollNumberCell = row.getCell(5).value;
      const password = row.getCell(6).value;

      if (!studentId || !name || !password) {
        skipped++;
        continue;
      }

      const hashedPassword = await bcrypt.hash(password.toString(), 10);
      // Resolve department DID from provided Department ID or Name
      let depDid = null;
      if (departmentCell) {
        const depNameStr = departmentCell.toString().trim();
        const maybeDid = depNameStr.toUpperCase();
        const deptDoc = await Department.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${depNameStr}$`, 'i') } },
            { did: maybeDid }
          ]
        }).lean();
        if (deptDoc) depDid = deptDoc.did;
      }

      const updateSet = {
        name: name.toString(),
        password: hashedPassword,
        isApproved: true, // Auto-approve bulk-imported students
      };
      if (depDid) updateSet.department = depDid;
      // Admission Year and derived Current Year
      const ayStr = (admissionYearCell !== undefined && admissionYearCell !== null && admissionYearCell !== '')
        ? admissionYearCell.toString().trim()
        : null;
      if (ayStr) {
        updateSet.admissionYear = ayStr;
        const match = ayStr.match(/(\d{4})/);
        if (match) {
          const startYear = parseInt(match[1], 10);
          if (startYear >= 1900 && startYear <= 2100) {
            const nowYear = new Date().getFullYear();
            const cy = Math.max(1, nowYear - startYear + 1);
            updateSet.currentYear = cy;
          }
        }
      }
      if (rollNumberCell !== undefined && rollNumberCell !== null && rollNumberCell !== '') {
        updateSet.rollNumber = rollNumberCell.toString().trim();
      } else {
        // Default roll number to studentId when not provided
        updateSet.rollNumber = studentId.toString().trim();
      }

      bulkOps.push({
        updateOne: {
          filter: { studentId: studentId.toString() },
          update: { $set: updateSet },
          upsert: true,
        },
      });

      processed++;
      if (processed % 25 === 0 || processed === totalRows) {
        eventService.emit("admin-notification", {
          type: "BULK_IMPORT_PROGRESS",
          target: "students",
          processed,
          total: totalRows,
          skipped,
          timestamp: Date.now(),
        });
      }
    }

    if (bulkOps.length === 0) {
      return res.status(400).json({ message: "No valid student data found in file." });
    }

    const result = await Student.bulkWrite(bulkOps);
    await logAction(req.user.id, 'BULK_IMPORT_STUDENTS', { count: bulkOps.length });

    // Emit completion event
    eventService.emit("admin-notification", {
      type: "BULK_IMPORT_COMPLETED",
      target: "students",
      imported: bulkOps.length,
      skipped,
      total: totalRows,
      timestamp: Date.now(),
    });

    res.status(201).json({ message: `${bulkOps.length} students imported successfully.` });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({ message: "Error processing file." });
  }
});

// Faculty bulk import (Excel)
router.post("/bulk/faculty", adminOnly, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  const workbook = new exceljs.Workbook();
  try {
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];
    const bulkOps = [];

    const totalRows = Math.max(worksheet.rowCount - 1, 0);
    let processed = 0;
    let skipped = 0;

    // Expected columns: [1] Faculty ID, [2] Name, [3] Department ID, [4] Password
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const facultyId = row.getCell(1).value;
      const name = row.getCell(2).value;
      const department = row.getCell(3).value;
      const password = row.getCell(4).value;

      if (!facultyId || !name || !department || !password) {
        skipped++;
        continue;
      }

      const hashedPassword = await bcrypt.hash(password.toString(), 10);

      bulkOps.push({
        updateOne: {
          filter: { facultyId: facultyId.toString() },
          update: {
            $set: {
              name: name.toString(),
              department: department.toString().toUpperCase().trim(),
              password: hashedPassword,
            },
          },
          upsert: true,
        },
      });

      processed++;
      if (processed % 25 === 0 || processed === totalRows) {
        eventService.emit("admin-notification", {
          type: "BULK_IMPORT_PROGRESS",
          target: "faculty",
          processed,
          total: totalRows,
          skipped,
          timestamp: Date.now(),
        });
      }
    }

    if (bulkOps.length === 0) {
      return res.status(400).json({ message: "No valid faculty data found in file." });
    }

    const result = await Faculty.bulkWrite(bulkOps);
    await logAction(req.user.id, 'BULK_IMPORT_FACULTY', { count: bulkOps.length });

    eventService.emit("admin-notification", {
      type: "BULK_IMPORT_COMPLETED",
      target: "faculty",
      imported: bulkOps.length,
      skipped,
      total: totalRows,
      timestamp: Date.now(),
    });

    res.status(201).json({ message: `${bulkOps.length} faculty imported successfully.` });
  } catch (error) {
    console.error("Faculty bulk import error:", error);
    res.status(500).json({ message: "Error processing file." });
  }
});

// ---------- TEMPLATE DOWNLOADS ----------
router.get("/template/students", adminOnly, async (_req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("StudentsTemplate");
    worksheet.columns = [
      { header: "Student ID", key: "studentId", width: 20 },
      { header: "Name", key: "name", width: 30 },
      { header: "Department ID", key: "department", width: 16 },
      { header: "Admission Year", key: "admissionYear", width: 18 },
      { header: "Roll Number", key: "rollNumber", width: 16 },
      { header: "Password", key: "password", width: 20 },
    ];
    worksheet.addRow({ studentId: "SID-001", name: "Alice Brown", department: "CSE", admissionYear: "2023", rollNumber: "001", password: "pass123" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="students_template.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Template export error:", error);
    res.status(500).json({ message: "Error generating template." });
  }
});

router.get("/template/faculty", adminOnly, async (_req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("FacultyTemplate");
    worksheet.columns = [
      { header: "Faculty ID", key: "facultyId", width: 20 },
      { header: "Name", key: "name", width: 30 },
      { header: "Department ID", key: "department", width: 20 },
      { header: "Password", key: "password", width: 20 },
    ];
    worksheet.addRow({ facultyId: "FAC-001", name: "John Doe", department: "CSE", password: "pass123" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="faculty_template.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Template export error:", error);
    res.status(500).json({ message: "Error generating template." });
  }
});

// ---------- REAL-TIME EVENTS (SSE) ----------
router.get("/events", adminOnly, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // Disable response buffering on some proxies (e.g., Nginx)
  try { res.setHeader("X-Accel-Buffering", "no"); } catch (_) {}
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send a confirmation message on connection
  sendEvent({ type: "CONNECTION_ESTABLISHED", message: "Live event stream connected." });

  // Heartbeat to keep the connection alive (comment lines are ignored by EventSource)
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch (_) {
      // If write fails, the 'close' event should follow and cleanup will run there
    }
  }, 15000);

  // Listen for new notifications and send them to the client
  const notificationListener = (notification) => {
    sendEvent(notification);
  };

  eventService.on("admin-notification", notificationListener);

  // Clean up when the client disconnects
  req.on("close", () => {
    eventService.removeListener("admin-notification", notificationListener);
    clearInterval(heartbeat);
    res.end();
  });
});

// ---------- EXPORT OPERATIONS ----------
router.get("/export/students", adminOnly, async (req, res) => {
  try {
    const students = await Student.find({}).lean();
    // Preload departments for name lookup
    const departments = await Department.find({}).select('did name').lean();
    const depMapByDid = new Map(departments.map((d) => [d.did, d.name]));

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Students");

    // Define columns and headers
    worksheet.columns = [
      { header: "Student ID", key: "studentId", width: 20 },
      { header: "Name", key: "name", width: 30 },
      { header: "Department Name", key: "departmentName", width: 24 },
      { header: "Department ID", key: "departmentId", width: 16 },
      { header: "Admission Year", key: "admissionYear", width: 16 },
      { header: "Roll Number", key: "rollNumber", width: 14 },
      { header: "Current Year", key: "currentYear", width: 14 },
      { header: "Approved", key: "isApproved", width: 15 },
      { header: "Registration Date", key: "createdAt", width: 25 },
    ];

    // Add data rows enriched with department name and derived fields
    const rows = students.map((s) => {
      const depDid = s.department || null;
      const depName = depDid ? (depMapByDid.get(depDid) || depDid) : "";
      return {
        studentId: s.studentId,
        name: s.name,
        departmentName: depName,
        departmentId: depDid || "",
        admissionYear: s.admissionYear ?? "",
        rollNumber: s.rollNumber ?? "",
        currentYear: s.currentYear ?? "",
        isApproved: !!s.isApproved,
        createdAt: s.createdAt,
      };
    });
    worksheet.addRows(rows);

    // Set headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="students_export_${Date.now()}.xlsx"`
    );

    // Stream the workbook to the response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Error exporting data." });
  }
});

router.get("/export/faculty", adminOnly, async (req, res) => {
  try {
    const faculty = await Faculty.find({}).lean();

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Faculty");

    worksheet.columns = [
      { header: "Faculty ID", key: "facultyId", width: 20 },
      { header: "Name", key: "name", width: 30 },
      { header: "Department", key: "department", width: 20 },
      { header: "Join Date", key: "createdAt", width: 25 },
    ];

    worksheet.addRows(faculty);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="faculty_export_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Error exporting data." });
  }
});

// ---------- ADVANCED REPORTS ----------
router.get("/reports/class/:classId", adminOnly, async (req, res) => {
  try {
    const { classId } = req.params;
    const classInfo = await Class.findById(classId).populate('facultyId').lean();

    if (!classInfo) {
      return res.status(404).json({ message: "Class not found." });
    }

    // Find all students enrolled in this class
    const enrolledStudents = await Student.find({ class: classInfo._id }).select('studentId name').lean();

    res.json({
      reportTitle: `Class Report: ${classInfo.className}`,
      generatedAt: new Date(),
      classDetails: classInfo,
      enrolledStudents: enrolledStudents,
      studentCount: enrolledStudents.length,
    });

  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({ message: "Error generating report." });
  }
});

// ---------- STUDENT ENROLLMENT ----------
router.post("/students/:studentId/enroll", [adminOnly, validate(enrollStudentSchema)], async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    const classToEnroll = await Class.findById(classId);
    if (!classToEnroll) {
      return res.status(404).json({ message: "Class not found." });
    }

    student.class = classToEnroll._id;
    await student.save();
    await logAction(req.user.id, 'ENROLL_STUDENT', { studentId: student._id, classId: classToEnroll._id });

    res.json({ message: `Student ${student.name} enrolled in class ${classToEnroll.className}.` });

  } catch (error) {
    console.error("Enrollment error:", error);
    res.status(500).json({ message: "Error enrolling student." });
  }
});

// ---------- AUDIT LOGS ----------
router.get("/audit-logs", adminOnly, async (req, res) => {
  try {
    const { page, limit, skip } = getPaging(req);

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate('adminId', 'adminId name') // Populate admin info
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(),
    ]);

    res.json({
      data: logs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error("Audit log fetch error:", error);
    res.status(500).json({ message: "Error fetching audit logs." });
  }
});

module.exports = router;
