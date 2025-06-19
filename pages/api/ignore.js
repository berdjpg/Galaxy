import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid name' });
  }

  const { error } = await supabase
    .from('clan_members')
    .update({ ignore: true })
    .eq('name', name);

  if (error) {
    console.error('Supabase update error:', error);
    return res.status(500).json({ error: 'Database update failed' });
  }

  return res.status(200).json({ success: true });
}
