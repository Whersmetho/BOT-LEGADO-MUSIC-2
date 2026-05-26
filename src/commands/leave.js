const { EmbedBuilder } = require('discord.js');
const { canControl } = require('../permissions');

module.exports = {
  name: 'leave',
  aliases: ['dc', 'disconnect'],
  description: 'Desconecta el bot del canal de voz',

  async execute(message, args, client) {
    const queueKey = `${message.guild.id}-${client.user.id}`;

    const queue = client.queues.get(queueKey);

    if (!queue) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#E74C3C')
            .setDescription('❌ No hay cola activa.')
        ]
      });
    }

    const { allowed, reason } = canControl(
      message.member,
      queue,
      'l!dc'
    );

    if (!allowed) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#E74C3C')
            .setDescription(reason)
        ]
      });
    }

    try {
      queue.destroy();
    } catch {}

    client.queues.delete(queueKey);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#95A5A6')
          .setDescription('👋 **Desconectado y cola limpiada.**')
      ]
    });
  },
};