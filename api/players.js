const players = global.players || new Map();
if (!global.players) global.players = players;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const allPlayers = Array.from(players.values());
  res.status(200).json(allPlayers);
}
