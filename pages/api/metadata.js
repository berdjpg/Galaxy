import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from('metadata')
      .select('value')
      .eq('key', 'last_clan_update')
      .single();

    if (error) throw error;

    res.status(200).json({ last_clan_update: data?.value });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
