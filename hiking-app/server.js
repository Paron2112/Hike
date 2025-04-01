require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB kapcsolat
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB kapcsolat létrejött"))
  .catch((err) => console.error("MongoDB hiba:", err));

// Felhasználói séma és modell
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model("User", UserSchema);

// Túrák séma és modell
const HikeSchema = new mongoose.Schema({
  userId: String,
  name: String,
  start: String,
  end: String,
  stops: [String],
});

const Hike = mongoose.model("Hike", HikeSchema);

// **REGISZTRÁCIÓ**
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Létezik már a felhasználó?
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "A felhasználó már létezik!" });

    // Jelszó titkosítása
    const hashedPassword = await bcrypt.hash(password, 10);

    // Új felhasználó mentése
    const user = new User({ username, password: hashedPassword });
    await user.save();

    // JWT token generálás
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Szerver hiba" });
  }
});

// **BEJELENTKEZÉS**
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Felhasználó keresése
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Érvénytelen felhasználónév vagy jelszó" });

    // Jelszó ellenőrzése
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Érvénytelen felhasználónév vagy jelszó" });

    // JWT token generálás
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Szerver hiba" });
  }
});

// **TÚRA HOZZÁADÁSA**
app.post("/api/hikes", async (req, res) => {
  try {
    const { token, name, start, end, stops } = req.body;

    // Token ellenőrzése
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) return res.status(401).json({ message: "Nem hitelesített hozzáférés" });

    // Új túra mentése
    const hike = new Hike({ userId: decoded.userId, name, start, end, stops });
    await hike.save();

    res.json({ message: "Túra sikeresen elmentve!" });
  } catch (err) {
    res.status(500).json({ message: "Szerver hiba" });
  }
});

// **MENTETT TÚRÁK LEKÉRÉSE**
app.get("/api/hikes", async (req, res) => {
  try {
    const { token } = req.headers;

    // Token ellenőrzése
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) return res.status(401).json({ message: "Nem hitelesített hozzáférés" });

    const hikes = await Hike.find({ userId: decoded.userId });

    res.json(hikes);
  } catch (err) {
    res.status(500).json({ message: "Szerver hiba" });
  }
});

// **Szerver indítása**
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));
