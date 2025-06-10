import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  try {
    // Fetch all members from DB
    const { data: members, error } = await supabase
      .from('clan_members')
      .select('*')
      .order('joined', { ascending: true });

    if (error) throw error;

    // Mark rank_changed based on some logic or saved state
    // For simplicity, here we just add false for now
    // You can adjust this if you track changes in another table or field

    const membersWithChanges = members.map(m => ({
      ...m,
      rank_changed: false, // or your logic here
    }));

    res.status(200).json(membersWithChanges);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
