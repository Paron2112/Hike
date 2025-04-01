const mongoose = require("mongoose");

const PointSchema = new mongoose.Schema({
  name: String,
  lat: Number,
  lng: Number
});

const HikeSchema = new mongoose.Schema({
  hikeName: { type: String, required: true },
  startLocation: { type: String, required: true },
  endLocation: { type: String, required: true },
  waypoints: [PointSchema],  // Megállók pontos koordinátákkal
  createdAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model("Hike", HikeSchema);