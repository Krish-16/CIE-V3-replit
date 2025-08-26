// routes/faculty.js
const express = require("express");
const router = express.Router();

//  ─── sample protected endpoint ────────────────────────────────
router.get("/ping", (_req, res) => {
  res.json({ message: "Faculty route alive" });
});

module.exports = router;
