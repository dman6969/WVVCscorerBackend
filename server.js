const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const Team = require('./models/team');
const Match = require('./models/match');
const bracketRoutes = require('./routes/bracket');
const archiveRoutes = require('./routes/archive');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

app.use(cors());
app.use(express.json());
// auto‑bracket generator routes
app.use('/api/bracket', bracketRoutes);
app.use('/api/archive', archiveRoutes);

// Get all teams
app.get('/api/teams', async (req, res) => {
  const teams = await Team.find();
  res.json(teams);
});

// Get team standings sorted by wins, points, and totalPointsScored
app.get('/api/standings', async (req, res) => {
  try {
    const teams = await Team.find().sort({ wins: -1, points: -1, totalPointsScored: -1 });
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


// Debug route to check MongoDB connectivity and match count
app.get('/api/debug-mongo', async (req, res) => {
  try {
    const matchCount = await Match.countDocuments();
    res.json({ status: 'connected', matchCount });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend server is running on port ${PORT}`);
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

app.post('/api/match-results', async (req, res) => {
  const { winner, team1, team2, setNumber, team1Score, team2Score } = req.body;

  if (!winner || !team1 || !team2 || !setNumber) {
    return res.status(400).json({ error: 'Missing required match result data.' });
  }

  // TEMP: Logging only — you can extend this logic to store in DB later
  console.log(`Match result received:
    Set ${setNumber}
    ${team1} (${team1Score}) vs ${team2} (${team2Score})
    Winner: ${winner}
  `);

  res.status(200).json({ message: 'Match result received successfully.' });
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

    // Allow updates for both sets before marking as finalized
    if (match.finalized && (match.team1Score !== 0 || match.team2Score !== 0)) {
      return res.status(400).send('Match already finalized');
    }

    const team1 = await Team.findOne({ name: match.team1 });
    const team2 = await Team.findOne({ name: match.team2 });

    if (!team1 || !team2) return res.status(400).send('Teams not found');

    // Update match score
    if (req.body.team1Score != null) match.team1Score = req.body.team1Score;
    if (req.body.team2Score != null) match.team2Score = req.body.team2Score;
    match.finalized = true;
    await match.save();

    // Update team stats
    team1.matchesPlayed += 1;
    team2.matchesPlayed += 1;

    // Add cumulative points scored
    team1.totalPointsScored += match.team1Score;
    team2.totalPointsScored += match.team2Score;

    const setsWonTeam1 = Number(req.body.setsWonTeam1) || 0;
    const setsWonTeam2 = Number(req.body.setsWonTeam2) || 0;
    console.log("📥 RECEIVED SET WINS:", setsWonTeam1, setsWonTeam2);

    team1.setsWon += setsWonTeam1;
    team2.setsWon += setsWonTeam2;

    // AAU beach scoring: 2 points for win, 1 for loss
    if (setsWonTeam1 > setsWonTeam2) {
      team1.points += 2;
      team2.points += 1;
      team1.wins += 1;
      team2.losses += 1;
    } else if (setsWonTeam2 > setsWonTeam1) {
      team2.points += 2;
      team1.points += 1;
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