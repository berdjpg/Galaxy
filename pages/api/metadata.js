import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('metadata')
      .select('last_clan_update')
      .limit(1)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ last_clan_update: data?.last_clan_update });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected server error' });
  }
}
