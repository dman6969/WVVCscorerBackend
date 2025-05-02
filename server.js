const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const Team = require('./models/team');
const Match = require('./models/match');

const app = express();
const port = 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

app.use(cors());
app.use(express.json());

// Get all teams
app.get('/api/teams', async (req, res) => {
  const teams = await Team.find();
  res.json(teams);
});

// Get team standings sorted by wins and points
app.get('/api/standings', async (req, res) => {
  try {
    const teams = await Team.find().sort({ wins: -1, points: -1 });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new team
app.post('/api/teams', async (req, res) => {
  try {
    const team = new Team(req.body);
    await team.save();
    res.status(201).json(team);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete team by name
app.delete('/api/teams/:name', async (req, res) => {
  try {
    const result = await Team.deleteOne({ name: decodeURIComponent(req.params.name) });
    if (result.deletedCount === 0) return res.sendStatus(404);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`✅ Backend server is running at http://localhost:${port}`);
});

// Get all matches (including finalized)
app.get('/api/matches', async (req, res) => {
  try {
    const matches = await Match.find(); // Ensure no filter on finalized
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new match
app.post('/api/matches', async (req, res) => {
  try {
    const { team1, team2 } = req.body;
    const team1Data = await Team.findOne({ name: team1 });
    const team2Data = await Team.findOne({ name: team2 });

    if (!team1Data || !team2Data) return res.status(400).send('Teams not found');

    const match = new Match({
      ...req.body,
      division: team1Data.division,
      team1Score: 0,
      team2Score: 0
    });

    await match.save();
    res.status(201).json(match);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a match by index
app.delete('/api/matches/:index', async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.index);
    if (!match) return res.sendStatus(404);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Clear all matches and reset team stats
app.delete('/api/matches', async (req, res) => {
  try {
    await Match.deleteMany({});
    await Team.updateMany({}, { $set: { matchesPlayed: 0, setsWon: 0, points: 0, wins: 0, losses: 0 } });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a match by index
app.put('/api/matches/:index', async (req, res) => {
  try {
    const match = await Match.findById(req.params.index);
    if (!match) return res.sendStatus(404);

    if (match.finalized) return res.status(400).send('Match already finalized');

    const team1 = await Team.findOne({ name: match.team1 });
    const team2 = await Team.findOne({ name: match.team2 });

    if (!team1 || !team2) return res.status(400).send('Teams not found');

    // Update match score
    match.team1Score = req.body.team1Score;
    match.team2Score = req.body.team2Score;
    match.finalized = true;
    await match.save();

    // Update team stats
    team1.matchesPlayed += 1;
    team2.matchesPlayed += 1;
    team1.points += match.team1Score;
    team2.points += match.team2Score;

    if (match.team1Score > match.team2Score) {
      team1.setsWon += 1;
      team1.wins += 1;
      team2.losses += 1;
    } else if (match.team2Score > match.team1Score) {
      team2.setsWon += 1;
      team2.wins += 1;
      team1.losses += 1;
    }

    await team1.save();
    await team2.save();

    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});