// routes/bracket.js
const express = require('express');
const Match = require('../models/match');
const { getStandings, seedBracket } = require('../utils/bracket');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// POST /api/bracket/:division — Generate bracket from finalized pool play
router.post('/:division', async (req, res) => {
  try {
    const { division } = req.params;

    const pool = await Match.find({
      division,
      round: { $in: ['round1', 'round2'] },
      finalized: true
    });

    if (pool.length === 0) {
      return res.status(400).json({ msg: 'No finalized pool matches yet.' });
    }

    const standings = getStandings(pool);
    const qfPairs = seedBracket(standings);

    if (qfPairs.length === 0) {
      return res.status(400).json({ msg: 'Not enough teams for bracket.' });
    }

    const now = Date.now();
    const created = await Promise.all(
      qfPairs.map((pair, i) =>
        Match.create({
          division,
          round: 'quarter',
          court: (i % 3) + 1,
          team1: pair[0],
          team2: pair[1],
          blueTeam: pair[0],
          orangeTeam: pair[1],
          time: new Date(now + i * 3600000),
          finalized: false
        })
      )
    );

    const archivePath = path.join(__dirname, '../data/tournamentArchive.json');
    const archiveEntry = {
      _id: Date.now().toString(),
      name: `${division} Tournament`,
      division,
      date: new Date().toISOString(),
      matches: created
    };

    let archive = [];
    if (fs.existsSync(archivePath)) {
      const raw = fs.readFileSync(archivePath, 'utf-8');
      archive = JSON.parse(raw);
    }

    archive.push(archiveEntry);
    fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));

    res.json({ created });

  } catch (err) {
    console.error('Error creating bracket:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/schedule-match — Save scheduled match with mapped matchTime
router.post('/schedule-match', async (req, res) => {
  try {
    console.log('✅ schedule-match hit', req.body);

    const match = new Match({
      ...req.body,
      time: req.body.matchTime // map matchTime from frontend to schema's time field
    });

    await match.save();
    console.log('✅ Match saved:', match);
    res.status(201).json(match);
  } catch (err) {
    console.error('❌ Failed to schedule match:', err);
    res.status(500).json({ error: 'Failed to schedule match' });
  }
});

module.exports = router;