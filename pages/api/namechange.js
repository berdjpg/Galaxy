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
    // Find member with oldName ignoring case
    const { data: member, error: findError } = await supabase
      .from('clan_members')
      .select('*')
      .ilike('name', oldName)
      .maybeSingle();

    if (findError) throw findError;

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Update member's name by id
    const { data: updatedMember, error: updateError } = await supabase
      .from('clan_members')
      .update({ name: newName })
      .eq('id', member.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json({ message: 'RSN updated successfully', member: updatedMember });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
