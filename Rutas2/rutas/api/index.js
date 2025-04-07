const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// .env betöltése
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const app = express();

// CORS konfiguráció
app.use(cors({
  origin: [
    'http://localhost:3000',
    `https://${process.env.VERCEL_URL}`,
    'https://*.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// MongoDB csatlakozás
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
const authRoutes = require('../server/routes/auth');
app.use('/api', authRoutes);

// Egyszerű health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});




// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Exportáld simán az Express app-ot
module.exports = app;