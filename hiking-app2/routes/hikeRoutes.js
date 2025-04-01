const express = require("express");
const hikeRoutes = require("../api/hikes.js");  // Figyeld meg: hikeRoutes, nem authRoutes

const router = express.Router();
router.use("/hikes", hikeRoutes);

module.exports = router;
