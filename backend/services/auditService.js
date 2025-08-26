const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log entry.
 * @param {string} adminId - The ID of the admin performing the action.
 * @param {string} action - The type of action performed.
 * @param {object} details - Additional details about the action.
 */
const logAction = async (adminId, action, details = {}) => {
  try {
    await AuditLog.create({
      adminId,
      action,
      details,
    });
  } catch (error) {
    // In a production environment, you might want to log this to a separate, more robust system
    // For now, we'll just log to the console to avoid crashing the primary operation.
    console.error('Failed to create audit log:', error);
  }
};

module.exports = { logAction };
