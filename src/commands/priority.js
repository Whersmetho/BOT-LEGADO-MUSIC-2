const BOT_PRIORITY = parseInt(process.env.BOT_PRIORITY || '1');

async function hasPriorityToPlay(message, client) {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) return true;

  const queueKey = `${message.guild.id}-${client.user.id}`;

  if (BOT_PRIORITY === 1) {
    const existingQueue = client.queues.get(queueKey);
    if (existingQueue && existingQueue.voiceChannel.id !== voiceChannel.id) {
      return false;
    }
  } else {
    await new Promise(r => setTimeout(r, 800));
    const freshChannel = message.guild.channels.cache.get(voiceChannel.id);
    const botsInChannel = freshChannel?.members?.filter(m => m.user.bot) ?? voiceChannel.members.filter(m => m.user.bot);
    if (botsInChannel.size > 0) return false;
  }

  return true;
}

function hasPriorityToControl(client, guildId) {
  const queue = client.queues.get(guildId);
  return !queue || queue !== undefined;
}

function isBotActiveInGuild(client, guild) {
  const botMember = guild.members.cache.get(client.user.id);
  return !!botMember?.voice?.channel;
}

module.exports = { hasPriorityToPlay, hasPriorityToControl, isBotActiveInGuild };
