const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE_DEPARTMENT',
      'UPDATE_DEPARTMENT',
      'DELETE_DEPARTMENT',
      'CREATE_FACULTY',
      'UPDATE_FACULTY',
      'DELETE_FACULTY',
      'APPROVE_STUDENT',
      'CREATE_CLASS',
      'UPDATE_CLASS',
      'DELETE_CLASS',
      'ASSIGN_FACULTY_TO_CLASS',
      'CREATE_SUBJECT',
      'UPDATE_SUBJECT',
      'DELETE_SUBJECT',
      'BULK_IMPORT_STUDENTS',
      'BULK_IMPORT_FACULTY',
      'ENROLL_STUDENT',
      'CREATE_EXAM',
      'UPDATE_EXAM',
      'DELETE_EXAM',
      'START_EXAM',
      'END_EXAM',
    ],
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Allows for flexible data storage
    default: {},
  },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
