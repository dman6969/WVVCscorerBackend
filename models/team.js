const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  division: { type: String, required: true },
  matchesPlayed: { type: Number, default: 0 },
  setsWon: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  totalPointsScored: { type: Number, default: 0 },
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;