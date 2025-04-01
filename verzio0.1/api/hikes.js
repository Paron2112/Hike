const express = require("express");
const Hike = require("../models/Hike");

const router = express.Router();

// Új túra hozzáadása
router.post("/", async (req, res) => {
    const { hikeName, startLocation, endLocation, stops } = req.body;

    try {
        const newHike = new Hike({ hikeName, startLocation, endLocation, stops });
        await newHike.save();
        res.status(201).json({ message: "Túra sikeresen mentve" });
    } catch (error) {
        res.status(500).json({ message: "Hiba történt a túra mentésekor." });
    }
});

// Összes túra lekérése
router.get("/", async (req, res) => {
    try {
        const hikes = await Hike.find();
        res.json(hikes);
    } catch (error) {
        res.status(500).json({ message: "Hiba történt a túrák lekérésekor." });
    }
});

module.exports = router; // Használd a module.exports-ot
