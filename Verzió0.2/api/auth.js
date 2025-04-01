const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

const router = express.Router();

// Regisztráció végpont
router.post("/auth/register", async (req, res) => {  // A /auth prefixet hozzáadjuk
    const { username, password } = req.body;

    try {
        // Ellenőrizzük, hogy létezik-e már felhasználónév
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "A felhasználónév már foglalt." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.status(201).json({ token });
    } catch (error) {
        res.status(500).json({ message: "Hiba történt a regisztráció során." });
    }
});

// Bejelentkezés végpont
router.post("/auth/login", async (req, res) => {  // A /auth prefixet hozzáadjuk
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
            res.json({ token });
        } else {
            res.status(401).json({ message: "Hibás felhasználónév vagy jelszó." });
        }
    } catch (error) {
        res.status(500).json({ message: "Hiba történt a bejelentkezés során." });
    }
});

module.exports = router;
