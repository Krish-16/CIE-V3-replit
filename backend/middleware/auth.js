const jwt = require("jsonwebtoken");

// Verify JWT and attach user payload to req.user
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  let token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  // Fallback: allow token via query for SSE/EventSource where headers can't be set
  if (!token && req.query && typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }
  if (!token) return res.status(401).json({ message: "Missing Bearer token" });

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not set in environment");
    return res.status(500).json({ message: "Server configuration error" });
  }

  try {
    const payload = jwt.verify(token, secret);
    req.user = payload; // { id, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Ensure the user has one of the allowed roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
