const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  name: String,
  latlng: [Number], // [latitude, longitude]
});

const routeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  points: [pointSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Route', routeSchema);