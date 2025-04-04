import express from "express";
import authRoutes from "../api/auth.js";

const router = express.Router();
router.use("/auth", authRoutes);

export default router;
