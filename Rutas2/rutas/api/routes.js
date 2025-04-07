const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Route = require('../models/Route');
const User = require('../models/User');

// Simple auth middleware (for demo purposes; use JWT in production)
const authMiddleware = (req, res, next) => {
  const userId = req.headers['user-id'];
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  req.userId = userId;
  next();
};

// Registro de usuario
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      const user = new User({ username, password });
      await user.save();
      res.status(201).json({ userId: user._id });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

// Login (simplified, no hashing for now)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all routes for a user
router.get('/routes', authMiddleware, async (req, res) => {
  try {
    const routes = await Route.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(routes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new route
router.post('/routes', authMiddleware, async (req, res) => {
  const route = new Route({
    userId: req.userId,
    name: req.body.name,
    points: [],
  });
  try {
    const savedRoute = await route.save();
    res.status(201).json(savedRoute);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add a point to a route
router.put('/routes/:id/point', authMiddleware, async (req, res) => {
  try {
    const route = await Route.findOne({ _id: req.params.id, userId: req.userId });
    if (!route) return res.status(404).json({ message: 'Route not found' });
    route.points.push(req.body.point);
    const updatedRoute = await route.save();
    res.json(updatedRoute);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a route
router.delete('/routes/:id', authMiddleware, async (req, res) => {
  try {
    const route = await Route.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json({ message: 'Route deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Nuevo endpoint para eliminar un punto
router.delete('/routes/:id/point/:pointId', authMiddleware, async (req, res) => {
    try {
      // Validar que los IDs sean válidos ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.pointId)) {
        return res.status(400).json({ message: 'Invalid route or point ID' });
      }
  
      const route = await Route.findOne({ _id: req.params.id, userId: req.userId });
      if (!route) return res.status(404).json({ message: 'Route not found' });
  
      const pointIndex = route.points.findIndex(point => point._id.toString() === req.params.pointId);
      if (pointIndex === -1) return res.status(404).json({ message: 'Point not found' });
  
      route.points.splice(pointIndex, 1); // Eliminar el punto
      const updatedRoute = await route.save();
      res.json(updatedRoute);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  // Nuevo endpoint para actualizar el nombre de un punto
router.put('/routes/:id/point/:pointId', authMiddleware, async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.pointId)) {
        return res.status(400).json({ message: 'Invalid route or point ID' });
      }
  
      const route = await Route.findOne({ _id: req.params.id, userId: req.userId });
      if (!route) return res.status(404).json({ message: 'Route not found' });
  
      const point = route.points.id(req.params.pointId); // Usar .id() para subdocumentos
      if (!point) return res.status(404).json({ message: 'Point not found' });
  
      point.name = req.body.name; // Actualizar el nombre
      const updatedRoute = await route.save();
      res.json(updatedRoute);
    } catch (err) {
      console.error('Error updating point:', err);
      res.status(500).json({ message: err.message });
    }
  });

module.exports = router;