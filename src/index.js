require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Collection,
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const { initSpotify } = require('./spotify');

// ==========================
// VARIABLES DE ENTORNO
// ==========================
const token = process.env.TOKEN?.trim();

const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

// ==========================
// VALIDAR TOKEN
// ==========================
if (!token) {
  console.error('❌ TOKEN no encontrado');
  process.exit(1);
}

// ==========================
// CLIENTE DISCORD
// ==========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

// ==========================
// COLECCIONES
// ==========================
client.commands = new Collection();
client.aliases = new Collection();
client.queues = new Map();

// ==========================
// CARGAR COMANDOS
// ==========================
const commandsPath = path.join(__dirname, 'commands');

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));

  client.commands.set(command.name, command);

  if (command.aliases) {
    for (const alias of command.aliases) {
      client.aliases.set(alias, command.name);
    }
  }
}

// ==========================
// READY
// ==========================
client.once('ready', () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);

  client.user.setActivity('🎵 l!help para comandos');

  // Spotify
  if (spotifyClientId && spotifyClientSecret) {
    initSpotify(spotifyClientId, spotifyClientSecret);
    console.log('🟢 Spotify conectado');
  } else {
    console.warn(
      '⚠️ Spotify no configurado. Solo YouTube disponible.'
    );
  }
});

// ==========================
// MENSAJES
// ==========================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const prefix = 'l!';

  if (!message.content.toLowerCase().startsWith(prefix)) return;

  const args = message.content
    .slice(prefix.length)
    .trim()
    .split(/ +/);

  const commandName = args.shift().toLowerCase();

  // Alias
  const resolvedName =
    client.aliases.get(commandName) || commandName;

  const command = client.commands.get(resolvedName);

  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(`❌ Error en comando ${commandName}:`, error);

    message.reply(
      '❌ Ocurrió un error ejecutando ese comando.'
    );
  }
});

// ==========================
// LOGIN
// ==========================
client
  .login(token)
  .then(() => {
    console.log('🟢 Login exitoso');
  })
  .catch((err) => {
    console.error('❌ Error al iniciar sesión:', err);
  });