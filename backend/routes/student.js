const express = require("express");
const router = express.Router();

router.get("/ping", (req, res) => {
  res.json({ message: "Student route is alive" });
});

module.exports = router;
