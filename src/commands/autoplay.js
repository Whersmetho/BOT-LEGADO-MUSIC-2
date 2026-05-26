const { EmbedBuilder } = require('discord.js');
const { canControl } = require('../permissions');

module.exports = {
  name: 'autoplay',
  aliases: ['ap'],
  description: 'Activa/desactiva el autoplay',
  async execute(message, args, client) {
    const queue = client.queues.get(`${message.guild.id}-${client.user.id}`);
    if (!queue || queue.songs.length === 0) return;

    const userChannel = message.member.voice.channel;
    if (!userChannel || userChannel.id !== queue.voiceChannel.id) return;

    const { allowed, reason } = canControl(message.member, queue, 'l!autoplay');
    if (!allowed) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription(reason)] });
    }

    const ap = queue.toggleAutoplay();
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(ap ? '#9B59B6' : '#95A5A6')
          .setDescription(ap ? '🔀 **Autoplay activado.** Reproduciré canciones relacionadas automáticamente.' : '⏹️ **Autoplay desactivado.**')
          .setFooter({ text: 'LEGADO MUSIC' })
      ]
    });
  },
};
