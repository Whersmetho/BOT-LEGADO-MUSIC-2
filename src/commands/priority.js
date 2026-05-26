async function hasPriorityToPlay(message, client) {
  const voiceChannel = message.member.voice.channel;

  if (!voiceChannel) return false;

  const myQueueKey = `${message.guild.id}-${client.user.id}`;

  const myQueue = client.queues.get(myQueueKey);

  if (myQueue && myQueue.playing) {
    return false;
  }

  const otherBots = voiceChannel.members.filter(
    m => m.user.bot && m.id !== client.user.id
  );

  if (otherBots.size > 0) {
    return false;
  }

  return true;
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
