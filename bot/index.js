const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (_, res) => res.send('Bot is running'));

app.listen(port, () => console.log(`Listening on port ${port}`));


require('dotenv').config();
console.log('DISCORD_TOKEN starts with:', process.env.DISCORD_TOKEN?.slice(0, 5));
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');
const { fetch } = require('undici');
const cron = require('node-cron'); 


const API_BASE = process.env.CLAN_API_BASE; // https://v0‑new‑project‑ptwxymzx9ew.vercel.app/api

const promotionTimes = { recruit:7, lieutenant:91 };
const validPromotions = { recruit:'Lieutenant', lieutenant:'Captain' };

function daysInRank(joined) {
  const diff = Date.now() - new Date(joined).getTime();
  return Math.floor(diff / (1000*60*60*24));
}

// Set up bot and commands
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check if the bot is online'),
  new SlashCommandBuilder()
    .setName('member')
    .setDescription('Get clan member stats')
    .addStringOption(opt => opt.setName('name').setDescription('RuneScape username').setRequired(true)),
  new SlashCommandBuilder()
    .setName('promotions')
    .setDescription('List currently eligible members for promotion'),
  new SlashCommandBuilder()
  .setName('ignore')
  .setDescription('Ignore a clan member from promotions')
  .addStringOption(opt => opt.setName('name').setDescription('RuneScape username to ignore').setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands…');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
})();

client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity('you', { type: ActivityType.Watching });

    // ✅ Daily promotions message at 12:00 PM Amsterdam time
    cron.schedule('0 12 * * *', async () => {
      try {
        const channel = await client.channels.fetch('1372362491522322452');
        const res = await fetch(`${API_BASE}/members`);
        const data = await res.json();

        const eligibleList = data
          .map(m => ({
            ...m,
            days: daysInRank(m.joined),
            nextRank: validPromotions[m.rank.toLowerCase()] ?? null
          }))
          .filter(m => m.nextRank && m.days >= (promotionTimes[m.rank.toLowerCase()] || Infinity));

        if (eligibleList.length === 0) {
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle('Promotion needed')
          .setColor('Pink')
          .setDescription(
            eligibleList
              .sort((a, b) => b.days - a.days)
              .map(m => `• **${m.name}** — ${m.rank} (${m.days} days) → **${m.nextRank}**`)
              .join('\n')
          );

        await channel.send({ embeds: [embed] });
        console.log('✅ Sent daily promotion message.');

      } catch (err) {
        console.error('❌ Failed to send daily promotions message:', err);
      }
    });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong! 🏓');
  }

  if (interaction.commandName === 'member') {
    const name = interaction.options.getString('name');
    await interaction.deferReply();
    try {
      const res = await fetch(`${API_BASE}/members`);
      const data = await res.json();
      const member = data.find(m => m.name.toLowerCase() === name.toLowerCase());

      if (!member) {
        return interaction.editReply(`\`No clan member found matching "${name}"\`.`);
      }

      const days = daysInRank(member.joined);
      const promo = validPromotions[member.rank.toLowerCase()] || null;
      const eligible = promo && days >= promotionTimes[member.rank.toLowerCase()];

      const embed = new EmbedBuilder()
        .setTitle(member.name)
        .addFields(
          { name: '🎖️ Rank', value: member.rank, inline: true },
          { name: '📅 Joined', value: new Date(member.joined).toLocaleDateString(), inline: true },
          { name: '⏱️ Days in rank', value: `${days}`, inline: true },
          { name: '🚀 Eligible?', value: eligible ? `Yes — can promote to **${promo}**` : 'No', inline: false }
        )
        .setColor(eligible ? 'Green' : 'Grey');

      interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      interaction.editReply('⚠️ Sorry, there was an error fetching clan data.');
    }

  } else if (interaction.commandName === 'promotions') {
    await interaction.deferReply();
    try {
      const res = await fetch(`${API_BASE}/members`);
      const data = await res.json();

      const eligibleList = data
        .map(m => ({
          ...m,
          days: daysInRank(m.joined),
          nextRank: validPromotions[m.rank.toLowerCase()] ?? null
        }))
        .filter(m => m.nextRank && m.days >= (promotionTimes[m.rank.toLowerCase()] || Infinity));

      if (eligibleList.length === 0) {
        return interaction.editReply('👥 No one is currently eligible for promotion.');
      }

      const embed = new EmbedBuilder()
        .setTitle('📢 Eligible for Promotion')
        .setColor('Blue')
        .setDescription(
          eligibleList
            .sort((a, b) => b.days - a.days)
            .map(m => `• **${m.name}** — ${m.rank} (${m.days} days) → **${m.nextRank}**`)
            .join('\n')
        );

      interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      interaction.editReply('⚠️ Sorry, there was an error fetching clan data.');
    }
  } else if (interaction.commandName === 'ignore') {
    const name = interaction.options.getString('name');
    await interaction.deferReply();

    try {
      const res = await fetch(`${API_BASE}/ignore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        },
        body: JSON.stringify({ name })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Failed to ignore member:', errText);
        return interaction.editReply(`❌ Failed to ignore \`${name}\`.`);
      }

      interaction.editReply(`✅ \`${name}\` is now ignored from promotions.`);
    } catch (err) {
      console.error(err);
      interaction.editReply('⚠️ Failed to communicate with the API.');
    }
  }

});

client.login(process.env.DISCORD_TOKEN);
