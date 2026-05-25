const { EmbedBuilder } = require('discord.js');
const { canControl } = require('../permissions');
const { isBotActiveInGuild } = require('./priority');

module.exports = {
  name: 'autoplay',
  aliases: ['ap'],
  description: 'Activa/desactiva el autoplay',
  async execute(message, args, client) {
    
    const queueKey = `${message.guild.id}-${client.user.id}`;
// Prioridad: si este bot no está activo en el servidor, ignorar silenciosamente
    if (!isBotActiveInGuild(client, message.guild)) return;

    const queue = client.queues.get(queueKey);
    if (!queue || !queue.playing) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ No hay música reproduciéndose.')] });
    }

    const { allowed, reason } = canControl(message.member, queue, 'l!autoplay');
    if (!allowed) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription(reason)] });
    }

    const ap = queue.toggleAutoplay();
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(ap ? '#9B59B6' : '#95A5A6')
          .setDescription(ap ? '🔀 **Autoplay activado.**' : '⏹️ **Autoplay desactivado.**')
          .setFooter({ text: 'LEGADO MUSIC' })
      ]
    });
  },
};
