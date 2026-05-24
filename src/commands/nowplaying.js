const { EmbedBuilder } = require('discord.js');
const { isBotActiveInGuild } = require('../priority');

function extractID(url) {
  const match = url?.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : '';
}

module.exports = {
  name: 'nowplaying',
  aliases: ['np'],
  description: 'Muestra la canción actual',
  async execute(message, args, client) {
    // Prioridad: si este bot no está activo en el servidor, ignorar silenciosamente
    if (!isBotActiveInGuild(client, message.guild)) return;

    const queue = client.queues.get(message.guild.id);
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
            { name: '🎧 Pedido por', value: song.requestedBy || 'Desconocido', inline: true },
            { name: '🔁 Bucle', value: queue.loop ? 'Activado' : 'Desactivado', inline: true },
            { name: '🔀 Autoplay', value: queue.autoplay ? 'Activado' : 'Desactivado', inline: true }
          )
          .setFooter({ text: 'LEGADO MUSIC' })
          .setTimestamp()
      ]
    });
  },
};
