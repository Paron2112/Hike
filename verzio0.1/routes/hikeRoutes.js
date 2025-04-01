import express from "express";
import hikeRoutes from "../api/hikes.js";

const router = express.Router();
router.use("/hikes", hikeRoutes);

export default router;
