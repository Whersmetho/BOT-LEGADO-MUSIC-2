const DJ_ROLE_NAMES = ['DJ', 'dj', 'Dj', 'Music', 'music', 'Mod', 'mod', 'Moderador'];

function isAdmin(member) {
  return member.permissions.has('Administrator') ||
         member.permissions.has('ManageGuild') ||
         member.permissions.has('ManageChannels');
}

function isDJ(member) {
  return member.roles.cache.some(r => DJ_ROLE_NAMES.includes(r.name));
}

function isPrivileged(member) {
  return isAdmin(member) || isDJ(member);
}

function canControl(member, queue, commandName = 'este comando') {
  if (isPrivileged(member)) return { allowed: true };
  if (!queue) return { allowed: true };

  const nowPlaying = queue.getNowPlaying();

  // requestedBy puede ser User object o string
  if (nowPlaying) {
    const rb = nowPlaying.requestedBy;
    const requesterId = typeof rb === 'string' ? rb : rb?.id;
    if (requesterId === member.id || requesterId === member.user.username) {
      return { allowed: true };
    }
  }

  // Si es el único humano en el canal
  const humanMembers = queue.voiceChannel.members.filter(m => !m.user.bot);
  if (humanMembers.size === 1 && humanMembers.has(member.id)) {
    return { allowed: true };
  }

  const requesterName = typeof nowPlaying?.requestedBy === 'string'
    ? nowPlaying.requestedBy
    : `<@${nowPlaying?.requestedBy?.id}>` || 'quien puso la canción';

  return {
    allowed: false,
    reason: `❌ Solo ${requesterName}, un **DJ** o un **Admin** puede usar \`${commandName}\`.`,
  };
}

function canStop(member, queue) {
  if (isPrivileged(member)) return { allowed: true };

  if (queue) {
    const humanMembers = queue.voiceChannel.members.filter(m => !m.user.bot);
    if (humanMembers.size === 1 && humanMembers.has(member.id)) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: '❌ Solo un **DJ** o **Admin** puede detener toda la cola.\n💡 Usa `l!skip` para saltar tu canción.',
  };
}

module.exports = { canControl, canStop, isPrivileged };
