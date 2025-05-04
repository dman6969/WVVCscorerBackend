const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const archivePath = path.join(__dirname, '../data/tournamentArchive.json');

// GET all archived tournaments
router.get('/', (req, res) => {
  fs.readFile(archivePath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to load archive' });
    res.json(JSON.parse(data));
  });
});

// GET a specific archived tournament's bracket by ID
router.get('/:id', (req, res) => {
  const id = req.params.id;
  fs.readFile(archivePath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to load archive' });
    const archive = JSON.parse(data);
    const matchGroup = archive.find(t => t._id === id);
    if (!matchGroup) return res.status(404).json({ error: 'Tournament not found' });
    res.json(matchGroup.matches);
  });
});

module.exports = router;