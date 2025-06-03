const players = global.players || new Map();
if (!global.players) global.players = players;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('Received body:', req.body);
  const { rsn, tileX, tileY, timestamp } = req.body;

  if (!rsn || tileX === undefined || tileY === undefined || !timestamp) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  players.set(rsn, { rsn, tileX, tileY, timestamp });

  res.status(200).end();
}
