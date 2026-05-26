const { EmbedBuilder } = require('discord.js');
const { canControl } = require('../permissions');
const { isBotActiveInGuild } = require('./priority');

module.exports = {
  name: 'leave',
  aliases: ['dc', 'disconnect'],
  description: 'Desconecta el bot y limpia la cola',

  async execute(message, args, client) {
    const queueKey = `${message.guild.id}-${client.user.id}`;

    // Prioridad
    if (!isBotActiveInGuild(client, message.guild)) return;

    const queue = client.queues.get(queueKey);

    if (!queue) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#E74C3C')
            .setDescription('❌ No hay una cola activa.')
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

    // Limpiar cola
    queue.songs = [];
    queue.playing = false;

    // Destruir conexión
    if (queue.connection) {
      queue.connection.destroy();
    }

    // Eliminar queue del bot actual
    client.queues.delete(queueKey);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#2ECC71')
          .setDescription('👋 Bot desconectado correctamente.')
      ]
    });
  },
};