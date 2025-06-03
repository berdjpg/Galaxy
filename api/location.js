import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: true,
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ set' : '❌ missing');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ set' : '❌ missing');
  console.log('Request body:', req.body);

  const { rsn, tileX, tileY, timestamp } = req.body;

  if (!rsn || tileX === undefined || tileY === undefined || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Converteer timestamp naar ISO-string (Postgres compatible)
  const timestampIso = new Date(Number(timestamp)).toISOString();

  const { error } = await supabase.from('players').upsert([
    { rsn, tileX, tileY, timestamp: timestampIso }
  ]);

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ message: 'Player saved' });
}
