const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const authRoutes = require("./api/auth");
const hikeRoutes = require("./api/hikes");
const path = require("path");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB kapcsolat
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB kapcsolat sikeresen létrejött"))
    .catch(err => console.error("❌ MongoDB hiba:", err));

// 🔹 Statikus fájlok kiszolgálása (a public mappa automatikusan kezeli az images fájlokat is!)
app.use(express.static(path.join(__dirname, "public")));

// Token validálás middleware
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];  // Authorization header
    if (!token) {
        return res.status(401).json({ error: "❌ Token szükséges!" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {  // JWT_SECRET környezeti változó
        if (err) {
            return res.status(401).json({ error: "❌ Érvénytelen token!" });
        }
        req.user = decoded;  // Felhasználói adatok hozzáadása a kéréshez
        next();
    });
};

// API végpontok
app.use("/api", authRoutes);  
app.use("/api", hikeRoutes);

// 🔹 Az index.html kiszolgálása CSAK akkor történjen meg, ha nincs más találat
app.get("*", (req, res, next) => {
    // Ha a fájl nem létezik, akkor menjen tovább a következő middleware-re
    if (!req.path.includes(".")) {
        return res.sendFile(path.join(__dirname, "public", "index.html"));
    }
    next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Szerver fut a ${PORT} porton`));
