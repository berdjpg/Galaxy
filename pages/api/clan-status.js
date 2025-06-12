import { createClient } from '@supabase/supabase-js';
import iconv from 'iconv-lite';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLAN_NAME = 'remenant';
const CLAN_API_URL = `http://services.runescape.com/m=clan-hiscores/members_lite.ws?clanName=${CLAN_NAME}`;

export default async function handler(req, res) {
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

    const buffer = Buffer.from(await clanResponse.arrayBuffer());
    const csvText = iconv.decode(buffer, 'win1252');

    const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
      console.error('No member data found in CSV');
      return res.status(500).json({ error: 'No member data found' });
    }

    lines.shift(); // Remove header

    const members = lines.map(line => {
      const cols = line.split(',');

      const name = cols[0]
        .replace(/\s+/g, ' ')
        .trim()
        .normalize('NFC');

      const rank = cols[1]
        .trim()
        .normalize('NFC');

      return { name, rank };
    });

    // Fetch current data from database
    const { data: existingMembers, error: selectError } = await supabase
      .from('clan_members')
      .select('name, rank, previous_rank, joined');

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
        // New member
        const newMember = {
          name: member.name,
          rank: member.rank,
          previous_rank: null,
          joined: now,
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
        // Existing member — check for rank change
        const rankChanged = existing.rank !== member.rank;

        if (rankChanged) {
          // Update member with new rank and previous rank
          const { error: updateError } = await supabase
            .from('clan_members')
            .update({
              rank: member.rank,
              previous_rank: existing.rank,
            })
            .eq('name', member.name);

          if (updateError) {
            console.error('Update error for member', member.name, updateError);
            return res.status(500).json({ error: 'Database update error' });
          }

          // Insert a new record in rank_change_history
          const { error: historyError } = await supabase
            .from('rank_change_history')
            .insert([{
              member_name: member.name,
              old_rank: existing.rank,
              new_rank: member.rank,
              changed_at: now,
            }]);

          if (historyError) {
            console.error('Insert error in rank_change_history for member', member.name, historyError);
            return res.status(500).json({ error: 'Database history insert error' });
          }

          changes.rankChanges.push({
            name: member.name,
            oldRank: existing.rank,
            newRank: member.rank,
            joined: existing.joined,
          });
        }
      }
    }

    // ✅ Save last update timestamp
    const { error: metaError } = await supabase
      .from('metadata')
      .upsert({ key: 'last_clan_update', value: now });

    if (metaError) {
      console.error('Failed to update metadata:', metaError);
    }

    return res.status(200).json({
      changes,
      totalMembers: members.length,
      lastUpdate: now,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err.message || err.toString(),
    });
  }
}
