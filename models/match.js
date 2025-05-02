const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  team1:     { type: String, required: true },
  team2:     { type: String, required: true },
  division:  { type: String, required: true },
  round:     { type: String },
  court:     { type: String },
  time:      { type: Date },
  team1Score:{ type: Number, default: 0 },
  team2Score:{ type: Number, default: 0 },
  finalized: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;