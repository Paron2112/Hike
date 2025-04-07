const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1. Keressük a felhasználót
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2. Jelszó ellenőrzés (ha van comparePassword metódus a User modellben)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Sikeres válasz
    res.json({ 
      success: true,
      user: {
        id: user._id,
        email: user.email
        // Egyéb felhasználói adatok...
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1. Ellenőrizzük, hogy létezik-e már a felhasználó
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // 2. Új felhasználó létrehozása
    const user = new User({ email, password });
    await user.save();

    // 3. Sikeres válasz
    res.json({ 
      success: true,
      user: {
        id: user._id,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;