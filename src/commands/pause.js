const { EmbedBuilder } = require('discord.js');
const { canControl } = require('../permissions');

module.exports = {
  name: 'pause',
  description: 'Pausa la reproducción',
  async execute(message, args, client) {
    const queue = client.queues.get(`${message.guild.id}-${client.user.id}`);
    if (!queue || queue.songs.length === 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ No hay música reproduciéndose.')] });
    }

    const { allowed, reason } = canControl(message.member, queue, 'l!pause');
    if (!allowed) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription(reason)] });
    }

    const paused = queue.pause();
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#F39C12')
          .setDescription(paused ? '⏸️ **Música pausada.**' : '⚠️ **Ya estaba pausada.**')
          .setFooter({ text: 'LEGADO MUSIC' })
      ]
    });
  },
};
