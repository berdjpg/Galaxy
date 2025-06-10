import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for write access

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLAN_NAME = 'remenant';
const CLAN_API_URL = `http://services.runescape.com/m=clan-hiscores/members_lite.ws?clanName=${CLAN_NAME}`;

export default async function handler(req, res) {
  try {
    // Fetch current clan members from RuneScape API
    const clanResponse = await fetch(CLAN_API_URL);
    if (!clanResponse.ok) {
      return res.status(500).json({ error: 'Failed to fetch clan data' });
    }
    const clanData = await clanResponse.json();
    const members = clanData.members; // Array of {name, joined, rank}

    // Load all existing members from Supabase
    const { data: existingMembers, error } = await supabase
      .from('clan_members')
      .select('*');

    if (error) throw error;

    // Index existing members by name for quick lookup
    const existingMap = {};
    for (const m of existingMembers) {
      existingMap[m.name] = m;
    }

    const changes = {
      newMembers: [],
      rankChanges: [],
    };

    // Upsert members & detect changes
    for (const member of members) {
      const existing = existingMap[member.name];

      if (!existing) {
        // New member joined
        changes.newMembers.push(member);
        await supabase.from('clan_members').insert([{
          name: member.name,
          rank: member.rank,
          joined: member.joined,
        }]);
      } else {
        // Member exists - check for rank change or joined change
        if (existing.rank !== member.rank || existing.joined !== member.joined) {
          changes.rankChanges.push({
            name: member.name,
            oldRank: existing.rank,
            newRank: member.rank,
            oldJoined: existing.joined,
            newJoined: member.joined,
          });

          await supabase.from('clan_members')
            .update({
              rank: member.rank,
              joined: member.joined,
            })
            .eq('name', member.name);
        }
      }
    }

    res.status(200).json({ changes, totalMembers: members.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
