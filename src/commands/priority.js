const guildLocks = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function hasPriorityToPlay(message, client) {
  const guildId = message.guild.id;

  // Si otro bot ya está intentando conectarse
  if (guildLocks.has(guildId)) {
    return false;
  }

  // Crear lock temporal
  guildLocks.set(guildId, client.user.id);

  // Esperar un momento para evitar race condition
  await sleep(800);

  try {
    const queueKey = `${guildId}-${client.user.id}`;

    const queue = client.queues.get(queueKey);

    // Si este bot ya tiene queue, permitir
    if (queue) {
      return true;
    }

    // Revisar si otro bot ya está conectado al voice
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      guildLocks.delete(guildId);
      return false;
    }

    const otherMusicBots = voiceChannel.members.filter(
      m =>
        m.user.bot &&
        m.id !== client.user.id
    );

    // Si ya hay otro bot conectado
    if (otherMusicBots.size > 0) {
      guildLocks.delete(guildId);
      return false;
    }

    return true;

  } finally {
    // Liberar lock
    setTimeout(() => {
      guildLocks.delete(guildId);
    }, 2000);
  }
}

function hasPriorityToControl(client, guildId) {
  const queueKey = `${guildId}-${client.user.id}`;

  return client.queues.has(queueKey);
}

function isBotActiveInGuild(client, guild) {
  const queueKey = `${guild.id}-${client.user.id}`;

  const queue = client.queues.get(queueKey);

  if (!queue) return false;

  const botMember = guild.members.cache.get(client.user.id);

  // Limpiar queue zombie
  if (!botMember?.voice?.channel) {
    client.queues.delete(queueKey);
    return false;
  }

  return true;
}

module.exports = {
  hasPriorityToPlay,
  hasPriorityToControl,
  isBotActiveInGuild,
};