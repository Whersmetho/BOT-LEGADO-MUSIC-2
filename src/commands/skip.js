const { EmbedBuilder } = require('discord.js');
const { canControl } = require('../permissions');
const { isBotActiveInGuild } = require('../priority');

module.exports = {
  name: 'skip',
  aliases: ['s'],
  description: 'Salta la canción actual',
  async execute(message, args, client) {
    // Prioridad: si este bot no está activo en el servidor, ignorar silenciosamente
    if (!isBotActiveInGuild(client, message.guild)) return;

    const queue = client.queues.get(message.guild.id);
    if (!queue || !queue.playing) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ No hay música reproduciéndose.')] });
    }

    const { allowed, reason } = canControl(message.member, queue, 'l!skip');
    if (!allowed) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription(reason)] });
    }

    const skipped = queue.getNowPlaying();
    queue.skip();
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#F39C12')
          .setAuthor({ name: '⏭️ Canción saltada' })
          .setDescription(`**${skipped?.title || 'Canción actual'}**`)
          .setFooter({ text: `Saltada por ${message.author.username} • LEGADO MUSIC` })
      ]
    });
  },
};
