require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const connectDB = require('./database'); // Import the database connection
const authRoutes = require('./api/auth');
const hikeRoutes = require('./api/hikes');

const app = express();

// 1. JAVÍTOTT: Környezeti változók ellenőrzése
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'DB_NAME'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Hiányzó környezeti változó: ${varName}`);
    process.exit(1);
  }
});

// 2. JAVÍTOTT: CORS konfiguráció
const allowedOrigins = [
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://hiking-app2.vercel.app',
  /https:\/\/hiking-app2(-.*)?\.vercel\.app/,
  'http://localhost:3000',
  'http://localhost:5000'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

// 3. JAVÍTOTT: MongoDB kapcsolat
connectDB(); // Connect to MongoDB

// Middleware-k
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. JAVÍTOTT: Statikus fájlok kezelése
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// 5. JAVÍTOTT: JWT middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ 
      error: "Authorization token required",
      solution: "Include your JWT in Authorization header or cookies"
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error(`JWT Error: ${err.message}`);
      return res.status(403).json({ 
        error: "Invalid token",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    req.user = decoded;
    next();
  });
};

// Útvonalak
app.use('/api/auth', authRoutes);
app.use('/api/hikes', verifyToken, hikeRoutes);

// 6. ÚJ: Egyszerűsített health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 7. JAVÍTOTT: Útvonalak kezelése
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

app.get(['/', '/index.html'], verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 8. JAVÍTOTT: Hibakezelés
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Szerver indítás
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
  🚀 Server running on port ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  Database: ${process.env.MONGODB_URI.split('@')[1].split('/')[0]}
  Allowed origins: ${allowedOrigins.join(', ')}
  `);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('❌ Shutdown error:', err);
        process.exit(1);
      });
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);