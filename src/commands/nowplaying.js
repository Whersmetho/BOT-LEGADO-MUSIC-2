const { EmbedBuilder } = require('discord.js');

function extractID(url) {
  const match = url?.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : '';
}

function formatRequester(requestedBy) {
  if (!requestedBy) return 'Desconocido';
  if (typeof requestedBy === 'string') return requestedBy;
  return `<@${requestedBy.id}>`;
}

module.exports = {
  name: 'nowplaying',
  aliases: ['np'],
  description: 'Muestra la canción actual',
  async execute(message, args, client) {
    const queueKey = `${message.guild.id}-${client.user.id}`;
    const queue = client.queues.get(queueKey);
    const song = queue?.getNowPlaying();

    if (!song) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ No hay nada reproduciéndose.')] });
    }

    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#9B59B6')
          .setAuthor({ name: '🎵 Sonando ahora' })
          .setTitle(song.title)
          .setURL(song.url)
          .setThumbnail(`https://img.youtube.com/vi/${extractID(song.url)}/hqdefault.jpg`)
          .addFields(
            { name: '⏱️ Duración', value: song.duration || '??:??', inline: true },
            { name: '🎧 Pedido por', value: formatRequester(song.requestedBy), inline: true },
            { name: '🔁 Bucle', value: queue.loop ? 'Activado' : 'Desactivado', inline: true },
            { name: '🔀 Autoplay', value: queue.autoplay ? 'Activado' : 'Desactivado', inline: true },
            { name: '📋 En cola', value: `${queue.getQueue().length} canciones`, inline: true },
          )
          .setFooter({ text: 'LEGADO MUSIC' })
          .setTimestamp()
      ]
    });
  },
};
