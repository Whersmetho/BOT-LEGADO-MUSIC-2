const { EmbedBuilder } = require('discord.js');
const { canControl } = require('../permissions');
const { isBotActiveInGuild } = require('../priority');

module.exports = {
  name: 'pause',
  description: 'Pausa la reproducción',
  async execute(message, args, client) {
    // Prioridad: si este bot no está activo en el servidor, ignorar silenciosamente
    if (!isBotActiveInGuild(client, message.guild)) return;

    const queue = client.queues.get(message.guild.id);
    if (!queue || !queue.playing) {
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
