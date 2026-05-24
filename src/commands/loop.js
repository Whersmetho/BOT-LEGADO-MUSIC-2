const { EmbedBuilder } = require('discord.js');
const { canControl } = require('../permissions');
const { isBotActiveInGuild } = require('../priority');

module.exports = {
  name: 'loop',
  description: 'Activa/desactiva el bucle',
  async execute(message, args, client) {
    // Prioridad: si este bot no está activo en el servidor, ignorar silenciosamente
    if (!isBotActiveInGuild(client, message.guild)) return;

    const queue = client.queues.get(message.guild.id);
    if (!queue || !queue.playing) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ No hay música reproduciéndose.')] });
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
