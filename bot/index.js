const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (_, res) => res.send('Bot is running'));

app.listen(port, () => console.log(`Listening on port ${port}`));


require('dotenv').config();
console.log('DISCORD_TOKEN starts with:', process.env.DISCORD_TOKEN?.slice(0, 5));
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PresenceUpdateStatus } = require('discord.js');
const { fetch } = require('undici');

// Your bot code here (e.g., Discord client login)


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
    .setName('member')
    .setDescription('Get clan member stats')
    .addStringOption(opt => opt.setName('name').setDescription('RuneScape username').setRequired(true)),
  new SlashCommandBuilder()
    .setName('promotions')
    .setDescription('List currently eligible members for promotion')
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
    client.user.setActivity('Lurking...');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

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
  }
});

client.login(process.env.DISCORD_TOKEN);
