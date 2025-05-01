

const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  team1: { type: String, required: true },
  team2: { type: String, required: true },
  division: { type: String, required: true },
  team1Score: { type: Number, required: true },
  team2Score: { type: Number, required: true },
  finalized: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;