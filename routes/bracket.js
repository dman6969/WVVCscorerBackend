// routes/bracket.js
const express = require('express');
const Match = require('../models/match');
const { getStandings, seedBracket } = require('../utils/bracket');

const router = express.Router();

// POST /api/bracket/:division
router.post('/:division', async (req, res) => {
  const { division } = req.params;

  // pull round‑1 + round‑2, finalized
  const pool = await Match.find({
    division,
    round: { $in: ['round1', 'round2'] },
    finalized: true
  });

  // basic completeness check
  if (pool.length === 0) {
    return res.status(400).json({ msg: 'No finalized pool matches yet.' });
  }

  const standings = getStandings(pool);
  const qfPairs   = seedBracket(standings);

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
        time: new Date(now + i * 3600000),   // 1‑hr stagger
        finalized: false
      })
    )
  );

  const fs = require('fs');
  const path = require('path');

  const archivePath = path.join(__dirname, '../data/tournamentArchive.json');

  const archiveEntry = {
    _id: Date.now().toString(), // simple unique ID
    name: `${division} Tournament`,
    division: division,
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
});

module.exports = router;