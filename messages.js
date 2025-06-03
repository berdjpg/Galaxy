export default function handler(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Simuleer een database
  const messageCounts = {
    '123': 5,
    '456': 42,
  };

  const count = messageCounts[userId] || 0;

  res.status(200).json({ count });
}
