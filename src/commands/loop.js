const { EmbedBuilder } = require('discord.js');
const { canControl } = require('../permissions');

module.exports = {
  name: 'loop',
  description: 'Activa/desactiva el bucle',
  async execute(message, args, client) {
    const queue = client.queues.get(`${message.guild.id}-${client.user.id}`);
    if (!queue || queue.songs.length === 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ No hay música en la cola.')] });
    }

    const { allowed, reason } = canControl(message.member, queue, 'l!loop');
    if (!allowed) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription(reason)] });
    }

    const looping = queue.toggleLoop();
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(looping ? '#9B59B6' : '#95A5A6')
          .setDescription(looping ? '🔁 **Bucle activado.**' : '➡️ **Bucle desactivado.**')
          .setFooter({ text: 'LEGADO MUSIC' })
      ]
    });
  },
};
