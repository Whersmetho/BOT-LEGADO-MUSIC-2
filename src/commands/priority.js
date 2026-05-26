const BOT_PRIORITY = parseInt(process.env.BOT_PRIORITY || '1');

async function hasPriorityToPlay(message, client) {
  const voiceChannel = message.member?.voice?.channel;

  if (!voiceChannel) return true;

  const queueKey = `${message.guild.id}-${client.user.id}`;

  const queue = client.queues.get(queueKey);

  // Si este bot ya tiene queue activa
  if (queue) {
    return true;
  }

  // Revisar otros bots SOLO si tienen queue real
  const activeQueues = [...client.queues.values()].filter(
    q => q && q.playing
  );

  // Si no hay queues activas, permitir
  if (activeQueues.length === 0) {
    return true;
  }

  // Prioridad
  if (BOT_PRIORITY === 1) {
    return true;
  }

  // Bot secundario espera un poco
  await new Promise(r => setTimeout(r, 1000));

  // Revisar otra vez después de esperar
  const updatedQueue = client.queues.get(queueKey);

  if (updatedQueue) {
    return true;
  }

  return activeQueues.length === 0;
}

function hasPriorityToControl(client, guildId) {
  const queueKey = `${guildId}-${client.user.id}`;

  const queue = client.queues.get(queueKey);

  return !!queue;
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