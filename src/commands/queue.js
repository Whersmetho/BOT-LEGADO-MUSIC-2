const { EmbedBuilder } = require('discord.js');
const { isBotActiveInGuild } = require('./priority');

function extractID(url) {
  const match = url?.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : '';
}

module.exports = {
  name: 'queue',
  aliases: ['q'],
  description: 'Muestra la cola de canciones',
  async execute(message, args, client) {
    // Prioridad: si este bot no está activo en el servidor, ignorar silenciosamente
    if (!isBotActiveInGuild(client, message.guild)) return;

    const queue = client.queues.get(message.guild.id);
    if (!queue || queue.songs.length === 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('📭 **La cola está vacía.**')] });
    }

    const now = queue.getNowPlaying();
    const upcoming = queue.getQueue();

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setAuthor({ name: '📋 Cola de reproducción' })
      .setThumbnail(`https://img.youtube.com/vi/${extractID(now.url)}/hqdefault.jpg`)
      .setFooter({ text: `LEGADO MUSIC • ${upcoming.length + 1} canción(es) en cola` })
      .setTimestamp();

    embed.addFields({
      name: '▶️ Reproduciendo ahora',
      value: `[${now.title}](${now.url}) • ${now.duration} • Pedido por ${now.requestedBy}`,
    });

    if (upcoming.length > 0) {
      const list = upcoming.slice(0, 10).map((s, i) =>
        `\`${i + 1}.\` [${s.title}](${s.url}) • ${s.duration}`
      ).join('\n');
      embed.addFields({ name: '⏭️ A continuación', value: list });
      if (upcoming.length > 10) {
        embed.addFields({ name: '\u200b', value: `_...y ${upcoming.length - 10} canciones más_` });
      }
    }

    if (queue.loop) embed.addFields({ name: '🔁 Bucle', value: 'Activado', inline: true });
    if (queue.autoplay) embed.addFields({ name: '🔀 Autoplay', value: 'Activado', inline: true });

    message.reply({ embeds: [embed] });
  },
};
