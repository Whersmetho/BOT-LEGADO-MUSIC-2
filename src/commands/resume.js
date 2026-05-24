const { EmbedBuilder } = require('discord.js');
const { canControl } = require('../permissions');

module.exports = {
  name: 'resume',
  aliases: ['r'],
  description: 'Reanuda la reproducción',
  async execute(message, args, client) {
    const queue = client.queues.get(message.guild.id);
    if (!queue) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ No hay música en cola.')] });
    }

    const { allowed, reason } = canControl(message.member, queue, 'l!resume');
    if (!allowed) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription(reason)] });
    }

    const resumed = queue.resume();
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#2ECC71')
          .setDescription(resumed ? '▶️ **Música reanudada.**' : '⚠️ **Ya se estaba reproduciendo.**')
          .setFooter({ text: 'LEGADO MUSIC' })
      ]
    });
  },
};
