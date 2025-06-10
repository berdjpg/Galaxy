import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Example /api/rank_history?member=someName
export default async function handler(req, res) {
  const { member } = req.query;
  if (!member) return res.status(400).json({ error: 'Missing member name' });

  const { data, error } = await supabase
    .from('rank_change_history')
    .select('old_rank, new_rank, changed_at')
    .eq('member_name', member)
    .order('changed_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data || []);
}
