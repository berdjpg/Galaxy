import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service Role Key for full access

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLAN_NAME = 'remenant';
const CLAN_API_URL = `http://services.runescape.com/m=clan-hiscores/members_lite.ws?clanName=${CLAN_NAME}`;

export default async function handler(req, res) {
  try {
    // Fetch current clan members from RuneScape API
    const clanResponse = await fetch(CLAN_API_URL);
    if (!clanResponse.ok) {
      console.error('Failed to fetch clan data:', clanResponse.status);
      return res.status(500).json({ error: 'Failed to fetch clan data' });
    }

    const csvText = await clanResponse.text();

    // Debug: log start of CSV data and total length to verify full response
    console.log('CSV data length:', csvText.length);
    console.log('CSV snippet:', csvText.slice(0, 500));

    // Parse CSV into array of members
    // Trim, split by line and filter out empty lines
    const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');

    if (lines.length < 2) {
      console.error('No member data found in CSV');
      return res.status(500).json({ error: 'No member data found' });
    }

    // Remove header line
    const header = lines.shift().split(',');

    const members = lines.map(line => {
      const cols = line.split(',');

      return {
        name: cols[0].trim(),
        rank: cols[1].trim(),
        joined: parseInt(cols[2].trim(), 10),
      };
    });

    console.log('Parsed members count:', members.length);

    if (!members || !Array.isArray(members)) {
      console.error('Invalid clan data format');
      return res.status(500).json({ error: 'Invalid clan data format' });
    }

    // Load all existing members from Supabase
    const { data: existingMembers, error: selectError } = await supabase
      .from('clan_members')
      .select('*');

    if (selectError) {
      console.error('Supabase select error:', selectError);
      return res.status(500).json({ error: 'Failed to read from database' });
    }

    // Index existing members by name for quick lookup
    const existingMap = {};
    for (const m of existingMembers) {
      existingMap[m.name] = m;
    }

    const changes = {
      newMembers: [],
      rankChanges: [],
    };

    // Process each member and upsert
    for (const member of members) {
      const existing = existingMap[member.name];

      if (!existing) {
        // New member joined
        changes.newMembers.push(member);
        const { error: insertError } = await supabase
          .from('clan_members')
          .insert([{
            name: member.name,
            rank: member.rank,
            joined: member.joined,
          }]);
        if (insertError) {
          console.error('Insert error for member', member.name, insertError);
          return res.status(500).json({ error: 'Database insert error' });
        }
      } else {
        // Member exists - check for rank or joined change
        if (existing.rank !== member.rank || existing.joined !== member.joined) {
          changes.rankChanges.push({
            name: member.name,
            oldRank: existing.rank,
            newRank: member.rank,
            oldJoined: existing.joined,
            newJoined: member.joined,
          });

          const { error: updateError } = await supabase
            .from('clan_members')
            .update({
              rank: member.rank,
              joined: member.joined,
            })
            .eq('name', member.name);

          if (updateError) {
            console.error('Update error for member', member.name, updateError);
            return res.status(500).json({ error: 'Database update error' });
          }
        }
      }
    }

    return res.status(200).json({ changes, totalMembers: members.length });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message || err.toString() });
  }
}
