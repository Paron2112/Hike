const express = require("express");
const authRoutes = require("../api/auth.js");

const router = express.Router();
router.use("/auth", authRoutes);

module.exports = router;
