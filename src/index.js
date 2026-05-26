require('dotenv').config();

const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { initSpotify } = require('./spotify');
const { handleMessage: automodHandle } = require('./automod');

const token = process.env.TOKEN?.trim();
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!token) { console.error('❌ TOKEN no encontrado'); process.exit(1); }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
client.aliases = new Collection();
client.queues = new Map();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.name, command);
  if (command.aliases) {
    for (const alias of command.aliases) client.aliases.set(alias, command.name);
  }
}

client.once('clientReady', () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
  client.user.setActivity('🎵 l!help para comandos');
  if (spotifyClientId && spotifyClientSecret) {
    initSpotify(spotifyClientId, spotifyClientSecret);
    console.log('🟢 Spotify conectado');
  }
});

// ── Manejo de botones interactivos ──────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const queueKey = `${interaction.guild.id}-${client.user.id}`;
  const queue = client.queues.get(queueKey);

  if (!queue) {
    return interaction.reply({ content: '❌ No hay música reproduciéndose.', ephemeral: true });
  }

  // Verificar que el usuario esté en el canal de voz
  const member = interaction.member;
  const inVoice = member?.voice?.channel?.id === queue.voiceChannel.id;
  if (!inVoice) {
    return interaction.reply({ content: '🎤 Debes estar en el canal de voz para usar los botones.', ephemeral: true });
  }

  await interaction.deferUpdate();

  switch (interaction.customId) {
    case 'btn_pause':
      if (queue.player.state.status === 'playing') {
        queue.pause();
        interaction.followUp({ content: '⏸️ Pausado.', ephemeral: true });
      } else {
        queue.resume();
        interaction.followUp({ content: '▶️ Reanudado.', ephemeral: true });
      }
      break;
    case 'btn_skip':
      queue.skip();
      interaction.followUp({ content: '⏭️ Saltado.', ephemeral: true });
      break;
    case 'btn_stop':
      queue.stop();
      client.queues.delete(queueKey);
      interaction.followUp({ content: '⏹️ Música detenida.', ephemeral: true });
      break;
    case 'btn_loop':
      const looping = queue.toggleLoop();
      interaction.followUp({ content: looping ? '🔁 Bucle activado.' : '➡️ Bucle desactivado.', ephemeral: true });
      break;
    case 'btn_autoplay':
      const ap = queue.toggleAutoplay();
      interaction.followUp({ content: ap ? '🔀 Autoplay activado.' : '⏹️ Autoplay desactivado.', ephemeral: true });
      break;
  }
});

// ── Mensajes ────────────────────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  await automodHandle(message, client);

  if (!message.guild) return;
  const prefix = 'l!';
  if (!message.content.toLowerCase().startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const resolvedName = client.aliases.get(commandName) || commandName;
  const command = client.commands.get(resolvedName);
  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(`❌ Error en comando ${commandName}:`, error);
    message.reply('❌ Ocurrió un error ejecutando ese comando.');
  }
});

client.login(token).then(() => console.log('🟢 Login exitoso')).catch(err => console.error('❌ Error al iniciar sesión:', err));
