import { createClient } from '@supabase/supabase-js';
import iconv from 'iconv-lite';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

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

      const name = cols[0].replace(/\s+/g, ' ').trim().normalize('NFC');
      const rank = cols[1].trim().normalize('NFC');

      return { name, rank };
    });

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
        const rankChanged = existing.rank !== member.rank;

        if (rankChanged) {
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

    const { error: metaError } = await supabase
      .from('metadata')
      .upsert({ key: 'last_clan_update', value: now });

    if (metaError) {
      console.error('Failed to update metadata:', metaError);
    }

    // ✅ Merge joined dates with current member list
    const membersWithJoin = members.map(m => {
      const existing = existingMap[m.name];
      return {
        ...m,
        joined: existing?.joined || now
      };
    });

    await sendPromotionsWebhook(membersWithJoin);

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

function daysInRank(joined) {
  const diff = Date.now() - new Date(joined).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function sendPromotionsWebhook(members) {
  const promotionTimes = { 
    recruit: 7, 
    corporal: 7, 
    sergeant: 7, 
    lieutenant: 91 
  };

  const validPromotions = { 
    recruit: 'Lieutenant', 
    corporal: 'Lieutenant', 
    sergeant: 'Lieutenant', 
    lieutenant: 'Captain' 
  };

  const eligible = members
    .map(m => ({
      ...m,
      days: daysInRank(m.joined),
      nextRank: validPromotions[m.rank.toLowerCase()] ?? null
    }))
    .filter(m => m.nextRank && m.days >= (promotionTimes[m.rank.toLowerCase()] || Infinity));

  if (eligible.length === 0) {
    console.log('No promotions needed');
    return;
  }

  const embed = {
    title: m.name,
    color: 0xff24e9,
    description: eligible
      .sort((a, b) => b.days - a.days)
      .map(m => `${m.rank} (${m.days} days) → Promote to **${m.nextRank}**`)
      .join('\n'),
    image: {
      url: `http://secure.runescape.com/m=avatar-rs/${m.name}/chat.png`
    },
    timestamp: new Date().toISOString(),
  };

  const payload = {
    username: 'Milkman',
    content: "### Promotion update",
    tts: false,
    embeds: [embed],
  };

  const res = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('❌ Failed to send webhook:', res.status);
  } else {
    console.log('✅ Sent promotions message via webhook.');
  }
}
