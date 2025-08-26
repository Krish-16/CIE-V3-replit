const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    // Robustly extract Zod issues (ZodError.issues) if present; otherwise fallback
    let errors = [];
    const issues = error?.issues || error?.errors; // support both shapes defensively
    if (Array.isArray(issues)) {
      errors = issues.map((err) => ({
        field: Array.isArray(err.path) ? err.path.join('.') : String(err.path ?? ''),
        message: err.message,
      }));
      return res.status(400).json({ message: 'Invalid request body', errors });
    }
    // Not a validation error
    return res.status(400).json({ message: error?.message || 'Invalid request' });
  }
};

module.exports = { validate };
