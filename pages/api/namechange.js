import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function rsnChangeHandler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { oldName, newName } = req.body;

  if (!oldName || !newName) {
    return res.status(400).json({ error: 'oldName and newName are required' });
  }

  try {
    // Update the member's name based on the old name
    const { data, error } = await supabase
      .from('clan_members')
      .update({ name: newName })
      .ilike('name', oldName) // Case-insensitive match
      .select()
      .single(); // Expecting only one match

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
