const players = new Map();

app.post('/location', (req, res) => {
  console.log('Received body:', req.body);  // <-- log wat binnenkomt
  const { rsn, tileX, tileY, timestamp } = req.body;
  if (!rsn || tileX === undefined || tileY === undefined || !timestamp) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  players.set(rsn, { rsn, tileX, tileY, timestamp });
  res.sendStatus(200);
});

app.get('/players', (req, res) => {
  const allPlayers = Array.from(players.values());
  res.json(allPlayers);
});