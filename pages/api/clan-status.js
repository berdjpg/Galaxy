import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLAN_NAME = 'remenant';
const CLAN_API_URL = `http://services.runescape.com/m=clan-hiscores/members_lite.ws?clanName=${CLAN_NAME}`;

export default async function handler(req, res) {
  try {
    const clanResponse = await fetch(CLAN_API_URL);
    if (!clanResponse.ok) {
      console.error('Failed to fetch clan data:', clanResponse.status);
      return res.status(500).json({ error: 'Failed to fetch clan data' });
    }

    const csvText = await clanResponse.text();
    const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');

    if (lines.length < 2) {
      console.error('No member data found in CSV');
      return res.status(500).json({ error: 'No member data found' });
    }

    lines.shift(); // Remove header

    const members = lines.map(line => {
      const cols = line.split(',');

      return {
        name: cols[0].trim(),
        rank: cols[1].trim(),
        // Ignore the joined field from API, we'll handle it via DB logic
      };
    });

    // Load existing members
    const { data: existingMembers, error: selectError } = await supabase
      .from('clan_members')
      .select('*');

    if (selectError) {
      console.error('Supabase select error:', selectError);
      return res.status(500).json({ error: 'Failed to read from database' });
    }

    const existingMap = {};
    for (const m of existingMembers) {
      existingMap[m.name] = m;
    }

    const changes = {
      newMembers: [],
      rankChanges: [],
    };

    const now = new Date().toISOString();

    for (const member of members) {
      const existing = existingMap[member.name];

      if (!existing) {
        // New member joined, set joined = NOW
        changes.newMembers.push(member);
        const { error: insertError } = await supabase
          .from('clan_members')
          .insert([{
            name: member.name,
            rank: member.rank,
            joined: now,
            rank_changed: false,
          }]);
        if (insertError) {
          console.error('Insert error for member', member.name, insertError);
          return res.status(500).json({ error: 'Database insert error' });
        }
      } else {
        // Check rank change only
        const rankChanged = existing.rank !== member.rank;

        if (rankChanged) {
          changes.rankChanges.push({
            name: member.name,
            oldRank: existing.rank,
            newRank: member.rank,
            joined: existing.joined, // keep existing joined timestamp
          });

          const { error: updateError } = await supabase
            .from('clan_members')
            .update({
              rank: member.rank,
              rank_changed: true,
            })
            .eq('name', member.name);

          if (updateError) {
            console.error('Update error for member', member.name, updateError);
            return res.status(500).json({ error: 'Database update error' });
          }
        } else {
          // No change - keep rank_changed false
          if (existing.rank_changed) {
            await supabase
              .from('clan_members')
              .update({ rank_changed: false })
              .eq('name', member.name);
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
