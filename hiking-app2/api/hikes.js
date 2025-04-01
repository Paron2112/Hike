const express = require("express");
const Hike = require("../models/Hike");
const verifyToken = require("../middleware/auth");

const router = express.Router();

// Új túra létrehozása
router.post("/", verifyToken, async (req, res) => {
  try {
    const { hikeName, startLocation, endLocation, waypoints } = req.body;
    
    if (!hikeName || !startLocation || !endLocation) {
      return res.status(400).json({ message: "Kérem, adja meg a túra nevét, a kezdőpontot és a végpontot!" });
    }

    const newHike = new Hike({
      hikeName,
      startLocation,
      endLocation,
      waypoints: waypoints || [],
      userId: req.user.id
    });

    await newHike.save();
    res.status(201).json(newHike);
  } catch (error) {
    console.error("Hiba történt a túra mentésekor:", error);
    res.status(500).json({ message: "Hiba történt a túra mentésekor." });
  }
});

// Összes túra lekérése (csak a bejelentkezett felhasználó túrái)
router.get("/", verifyToken, async (req, res) => {
  try {
    const hikes = await Hike.find({ userId: req.user.id });
    res.json(hikes);
  } catch (error) {
    console.error("Hiba történt a túrák lekérésekor:", error);
    res.status(500).json({ message: "Hiba történt a túrák lekérésekor." });
  }
});

// Egy túra lekérése
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const hike = await Hike.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!hike) {
      return res.status(404).json({ message: "Túra nem található" });
    }
    
    res.json(hike);
  } catch (error) {
    console.error("Hiba történt a túra lekérésekor:", error);
    res.status(500).json({ message: "Hiba történt a túra lekérésekor." });
  }
});

// Túra frissítése
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { waypoints } = req.body;
    
    const updatedHike = await Hike.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { waypoints },
      { new: true }
    );
    
    if (!updatedHike) {
      return res.status(404).json({ message: "Túra nem található" });
    }
    
    res.json(updatedHike);
  } catch (error) {
    console.error("Hiba történt a túra frissítésekor:", error);
    res.status(500).json({ message: "Hiba történt a túra frissítésekor." });
  }
});

// Túra törlése
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const deletedHike = await Hike.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!deletedHike) {
      return res.status(404).json({ message: "Túra nem található" });
    }
    
    res.json({ message: "Túra sikeresen törölve" });
  } catch (error) {
    console.error("Hiba történt a túra törlésekor:", error);
    res.status(500).json({ message: "Hiba történt a túra törlésekor." });
  }
});

module.exports = router;