const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

const router = express.Router();

// Jelszó erősségének ellenőrzése
const isPasswordStrong = (password) => {
  const minLength = 6;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  return password.length >= minLength && hasNumber && hasLetter;
};

// Regisztráció
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validáció
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Felhasználónév és jelszó megadása kötelező!" 
      });
    }

    if (!isPasswordStrong(password)) {
      return res.status(400).json({ 
        success: false,
        message: "A jelszónak legalább 6 karakter hosszúnak kell lennie, és tartalmaznia kell betűt és számot!" 
      });
    }

    // Felhasználónév normalizálása (kisbetűsítés)
    const normalizedUsername = username.toLowerCase().trim();

    // Létezik-e már a felhasználó
    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "A felhasználónév már foglalt!" 
      });
    }

    // Jelszó hashelése
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ 
      username: normalizedUsername, 
      password: hashedPassword 
    });

    await newUser.save();

    // Token generálása (24 órás érvényességgel)
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      token,
      userId: newUser._id,
      username: newUser.username,
      message: "Sikeres regisztráció!"
    });

  } catch (error) {
    console.error("Regisztrációs hiba:", error);
    res.status(500).json({ 
      success: false,
      message: "Szerverhiba történt a regisztráció során" 
    });
  }
});

// Bejelentkezés
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validáció
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Felhasználónév és jelszó megadása kötelező!" 
      });
    }

    // Felhasználó keresése (kisbetűsített névvel)
    const normalizedUsername = username.toLowerCase().trim();
    const user = await User.findOne({ username: normalizedUsername });
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Hibás felhasználónév vagy jelszó!" 
      });
    }

    // Jelszó ellenőrzése
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Hibás felhasználónév vagy jelszó!" 
      });
    }

    // Token generálása (24 órás érvényességgel)
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      userId: user._id,
      username: user.username,
      message: "Sikeres bejelentkezés!"
    });

  } catch (error) {
    console.error("Bejelentkezési hiba:", error);
    res.status(500).json({ 
      success: false,
      message: "Szerverhiba történt a bejelentkezés során" 
    });
  }
});

module.exports = router;