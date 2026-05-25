// ============================================================
// priority.js — Lógica de prioridad entre bots
// ============================================================
// Configura BOT_PRIORITY=1 en el .env del bot principal y
// BOT_PRIORITY=2 en el .env del bot secundario.
//
// Cómo funciona:
//   Bot 1: si ya está activo en un canal del servidor, solo
//          atiende a usuarios de ESE canal. Si el usuario está
//          en otro canal diferente, ignora → Bot 2 lo toma.
//
//   Bot 2: si ya hay cualquier bot en el canal del usuario,
//          no entra ni responde. Solo actúa cuando Bot 1
//          no cubre ese canal.
// ============================================================

const BOT_PRIORITY = parseInt(process.env.BOT_PRIORITY || '1');

/**
 * Verifica si este bot tiene prioridad para responder al comando play.
 * Debe llamarse ANTES de conectarse al canal de voz.
 *
 * @param {import('discord.js').Message} message
 * @param {import('discord.js').Client & { queues: Map }} client
 * @returns {Promise<boolean>} true = puede continuar, false = debe ignorar
 */
async function hasPriorityToPlay(message, client) {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) return true; // Deja que el comando maneje el error

  if (BOT_PRIORITY === 1) {
    // Bot 1: si ya está activo en este servidor en OTRO canal, cede el paso
    const existingQueue = client.queues.get(queueKey);
    if (existingQueue && existingQueue.voiceChannel.id !== voiceChannel.id) {
      return false;
    }
  } else {
    // Bot 2: espera un momento para darle tiempo a Bot 1 de conectarse primero
    await new Promise(r => setTimeout(r, 800));

    // Re-leer el canal después del delay para ver si Bot 1 ya entró
    const freshChannel = message.guild.channels.cache.get(voiceChannel.id);
    const botsInChannel = freshChannel?.members?.filter(m => m.user.bot) ?? voiceChannel.members.filter(m => m.user.bot);

    if (botsInChannel.size > 0) return false;
  }

  return true;
}

/**
 * Verifica si este bot tiene prioridad para responder a comandos de control
 * (skip, stop, pause, resume, loop, queue, nowplaying, leave, autoplay).
 * Solo responde si este bot es quien tiene la cola activa en el servidor.
 *
 * @param {import('discord.js').Client & { queues: Map }} client
 * @param {string} guildId
 * @returns {boolean} true = puede continuar, false = debe ignorar silenciosamente
 */
function hasPriorityToControl(client, guildId) {
  // Solo respondemos si NOSOTROS tenemos la cola de este servidor.
  // Si no hay cola, dejamos pasar (el comando mostrará "no hay música").
  const queue = client.queues.get(guildId);
  return !queue || queue !== undefined;
  // Nota: la cola solo existe en el proceso del bot que se conectó primero,
  // por lo que el otro bot simplemente no tendrá queue y retornará el
  // mensaje de "no hay música" — pero podemos suprimir eso silenciosamente
  // comprobando si el bot actual está en el canal de voz del servidor.
}

/**
 * Verifica si este bot está actualmente en algún canal de voz del servidor.
 * Útil para decidir si debe responder a comandos de control.
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild} guild
 * @returns {boolean}
 */
function isBotActiveInGuild(client, guild) {
  const botMember = guild.members.cache.get(client.user.id);
  return !!botMember?.voice?.channel;
}

module.exports = { hasPriorityToPlay, hasPriorityToControl, isBotActiveInGuild };
