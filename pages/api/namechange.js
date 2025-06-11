import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function rsnChangeHandler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { memberId, newName } = req.body;

  if (!memberId || !newName) {
    return res.status(400).json({ error: 'memberId and newName are required' });
  }

  try {
    // Update the 'name' (RSN) for the specified member
    const { data, error } = await supabase
      .from('clan_members')
      .update({ name: newName })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.status(200).json({ message: 'RSN updated successfully', member: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
