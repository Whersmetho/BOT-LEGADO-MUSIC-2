const { EmbedBuilder } = require('discord.js');

// Dominios bloqueados
const BLOCKED_DOMAINS = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'xhamster.com',
  'redtube.com',
  'youporn.com',
  'tube8.com',
  'onlyfans.com',
  'fansly.com',
];

// Palabras bloqueadas (puedes agregar más)
const BLOCKED_WORDS = [];

// Canales excluidos del automod (IDs de canales donde no aplica)
const EXCLUDED_CHANNELS = [];

function containsBlockedContent(content) {
  const lower = content.toLowerCase();

  // Verificar dominios bloqueados
  for (const domain of BLOCKED_DOMAINS) {
    if (lower.includes(domain)) return { blocked: true, reason: `dominio bloqueado: ${domain}` };
  }

  // Verificar palabras bloqueadas
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) return { blocked: true, reason: `palabra bloqueada` };
  }

  return { blocked: false };
}

async function handleMessage(message, client) {
  // Ignorar bots y DMs
  if (message.author.bot) return;
  if (!message.guild) return;

  // Ignorar canales excluidos
  if (EXCLUDED_CHANNELS.includes(message.channel.id)) return;

  // Ignorar admins y moderadores
  const member = message.member;
  if (member?.permissions.has('ManageMessages')) return;

  const { blocked, reason } = containsBlockedContent(message.content);

  if (blocked) {
    try {
      // Borrar el mensaje
      await message.delete();

      // Avisar al usuario
      const warning = await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#E74C3C')
            .setAuthor({ name: '🛡️ AutoMod' })
            .setDescription(`${message.author}, tu mensaje fue eliminado por contener contenido no permitido.`)
            .setFooter({ text: `Razón: ${reason}` })
            .setTimestamp()
        ]
      });

      // Borrar el aviso después de 5 segundos
      setTimeout(() => warning.delete().catch(() => {}), 5000);

      console.log(`[AutoMod] Mensaje eliminado de ${message.author.tag}: ${reason}`);
    } catch (err) {
      console.error('[AutoMod] Error al eliminar mensaje:', err.message);
    }
  }
}

module.exports = { handleMessage };
