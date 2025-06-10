import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLAN_NAME = 'remenant';
const CLAN_API_URL = `http://services.runescape.com/m=clan-hiscores/members_lite.ws?clanName=${CLAN_NAME}`;

export default async function handler(req, res) {
  // 🔒 Authorization check
  if (req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  console.log('Cron job triggered at', new Date().toISOString());

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

      // Normalize and clean spaces to fix broken characters or spaces
      const name = cols[0]
        .replace(/\s+/g, ' ')  // Replace any whitespace runs with single space
        .trim()
        .normalize('NFC');      // Normalize unicode characters (NFC is standard)

      const rank = cols[1]
        .trim()
        .normalize('NFC');

      return { name, rank };
    });

    // Fetch existing members from Supabase, including previous_rank etc.
    const { data: existingMembers, error: selectError } = await supabase
      .from('clan_members')
      .select('name, rank, previous_rank, joined, rank_changed');

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
        // New member: insert with current timestamp, previous_rank null
        const newMember = {
          name: member.name,
          rank: member.rank,
          previous_rank: null,
          joined: now,
          rank_changed: false,
        };

        const { error: insertError } = await supabase
          .from('clan_members')
          .insert([newMember]);

        if (insertError) {
          console.error('Insert error for member', member.name, insertError);
          return res.status(500).json({ error: 'Database insert error' });
        }

        changes.newMembers.push(newMember);
      } else {
        // Rank change detection
        const rankChanged = existing.rank !== member.rank;

        if (rankChanged) {
          const { error: updateError } = await supabase
            .from('clan_members')
            .update({
              previous_rank: existing.rank, // save old rank
              rank: member.rank,
              rank_changed: true,
            })
            .eq('name', member.name);

          if (updateError) {
            console.error('Update error for member', member.name, updateError);
            return res.status(500).json({ error: 'Database update error' });
          }

          changes.rankChanges.push({
            name: member.name,
            oldRank: existing.rank,
            newRank: member.rank,
            joined: existing.joined,
          });
        } else if (existing.rank_changed) {
          // Reset stale rank_changed flag and clear previous_rank
          await supabase
            .from('clan_members')
            .update({ rank_changed: false, previous_rank: null })
            .eq('name', member.name);
        }
      }
    }

    return res.status(200).json({ changes, totalMembers: members.length });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message || err.toString() });
  }
}
