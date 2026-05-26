function isBotActiveInGuild(client, guild) {
  const queueKey = `${guild.id}-${client.user.id}`;

  const queue = client.queues.get(queueKey);

  if (!queue) return false;

  const botMember = guild.members.cache.get(client.user.id);

  if (!botMember?.voice?.channel) {
    client.queues.delete(queueKey);
    return false;
  }

  return true;
}

function hasPriorityToControl(client, guildId) {
  const queueKey = `${guildId}-${client.user.id}`;

  const queue = client.queues.get(queueKey);

  return !!queue;
}

function hasPriorityToPlay(client, guildId) {
  const queueKey = `${guildId}-${client.user.id}`;

  const queue = client.queues.get(queueKey);

  if (!queue) return true;

  return true;
}

module.exports = {
  isBotActiveInGuild,
  hasPriorityToControl,
  hasPriorityToPlay,
};