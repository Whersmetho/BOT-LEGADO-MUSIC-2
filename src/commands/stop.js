const { EmbedBuilder } = require('discord.js');
const { canStop } = require('../permissions');
const { isBotActiveInGuild } = require('./priority');

module.exports = {
  name: 'stop',
  description: 'Detiene la música y limpia la cola (solo DJ/Admin)',
  async execute(message, args, client) {
    // Prioridad: si este bot no está activo en el servidor, ignorar silenciosamente
    if (!isBotActiveInGuild(client, message.guild)) return;

    const queue = client.queues.get(message.guild.id);
    if (!queue) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ No hay música en cola.')] });
    }

    const { allowed, reason } = canStop(message.member, queue);
    if (!allowed) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription(reason)] });
    }

    queue.stop();
    client.queues.delete(message.guild.id);
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#E74C3C')
          .setDescription('⏹️ **Música detenida y cola limpiada.**')
          .setFooter({ text: `Detenido por ${message.author.username} • LEGADO MUSIC` })
      ]
    });
  },
};
