/**
 * Sistema de permisos del bot de música
 * 
 * Niveles:
 * 1. Admin/DJ     — control total siempre
 * 2. Solicitante  — puede controlar si es el único en el canal o quien puso la canción
 * 3. Otros        — solo pueden añadir canciones a la cola
 */

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

/**
 * Verifica si el miembro puede usar comandos de control (skip, stop, pause, etc.)
 * @param {GuildMember} member - El miembro que ejecuta el comando
 * @param {GuildQueue} queue - La cola actual
 * @param {string} commandName - Nombre del comando para mensajes de error
 * @returns {{ allowed: boolean, reason?: string }}
 */
function canControl(member, queue, commandName = 'este comando') {
  // Admins y DJs siempre pueden
  if (isPrivileged(member)) return { allowed: true };

  if (!queue) return { allowed: true };

  const nowPlaying = queue.getNowPlaying();

  // Si la canción fue pedida por este usuario, puede controlarla
  if (nowPlaying && nowPlaying.requestedBy === member.user.username) {
    return { allowed: true };
  }

  // Si es el único en el canal de voz (además del bot), puede controlar
  const voiceChannel = queue.voiceChannel;
  const humanMembers = voiceChannel.members.filter(m => !m.user.bot);
  if (humanMembers.size === 1 && humanMembers.has(member.id)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `❌ Solo **${nowPlaying?.requestedBy || 'quien puso la canción'}**, un **DJ** o un **Admin** puede usar \`${commandName}\`.`,
  };
}

/**
 * Solo admins/DJs pueden parar toda la cola (stop)
 */
function canStop(member, queue) {
  if (isPrivileged(member)) return { allowed: true };

  // Solo si está solo en el canal
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
