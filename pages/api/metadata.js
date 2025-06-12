import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const { data, error } = await supabase
    .from('metadata')
    .select('last_clan_update')
    .limit(1)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ last_clan_update: data?.last_clan_update });
}
