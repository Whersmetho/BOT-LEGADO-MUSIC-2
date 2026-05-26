const { EmbedBuilder } = require('discord.js');
const { canControl } = require('../permissions');

module.exports = {
  name: 'leave',
  aliases: ['dc', 'disconnect'],
  description: 'Desconecta el bot del canal de voz',

  async execute(message, args, client) {
    const queueKey = `${message.guild.id}-${client.user.id}`;

    const queue = client.queues.get(queueKey);

    // Si este bot no tiene cola activa, ignorar silenciosamente.
    // Así solo responde el bot que realmente estaba tocando.
    if (!queue) {
      return;
    }

    // Verificar que este bot está en el mismo canal de voz que el usuario.
    // Si el usuario no está en ningún canal, o está en uno diferente, ignorar.
    const userChannel = message.member.voice.channel;
    const botChannel = queue.voiceChannel;

    if (!userChannel || userChannel.id !== botChannel.id) {
      return;
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
