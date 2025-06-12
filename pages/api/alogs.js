import { createClient } from '@supabase/supabase-js';
import iconv from 'iconv-lite';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Adventure log cron triggered at', new Date().toISOString());

  try {
    const { data: members, error: fetchError } = await supabase
      .from('clan_members')
      .select('name');

    if (fetchError) {
      console.error('Error fetching members:', fetchError);
      return res.status(500).json({ error: 'Database error' });
    }

    let totalNewEntries = 0;

    for (const member of members) {
      const encodedName = encodeURIComponent(member.name);
      const url = `https://apps.runescape.com/runemetrics/profile/adventure?user=${encodedName}&activities=20`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`No log for ${member.name}: HTTP ${response.status}`);
          continue;
        }

        const json = await response.json();
        const activities = json.activities ?? [];

        for (const activity of activities) {
          const { text, date } = activity;
          const timestamp = new Date(date);

          const { error: insertError } = await supabase
            .from('adventure_log_entries')
            .insert({
              name: member.name,
              text,
              date: timestamp,
            });

          if (!insertError) {
            totalNewEntries += 1;
          } else if (!insertError.message.includes('duplicate key')) {
            console.error(`Insert error for ${member.name}:`, insertError);
          }
        }
      } catch (err) {
        console.error(`Error fetching log for ${member.name}:`, err);
      }
    }

    return res.status(200).json({
      totalNewEntries,
      message: 'Adventure logs synced',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
