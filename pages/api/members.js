import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  try {
    // Fetch all members from the database
    const { data: members, error } = await supabase
      .from('clan_members')
      .select('*')
      .order('joined', { ascending: true });

    if (error) throw error;

    res.status(200).json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
