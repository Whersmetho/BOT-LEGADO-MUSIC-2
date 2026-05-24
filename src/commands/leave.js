const { EmbedBuilder } = require('discord.js');
const { canStop } = require('../permissions');
const { isBotActiveInGuild } = require('./priority');

module.exports = {
  name: 'leave',
  aliases: ['dc', 'disconnect'],
  description: 'Desconecta el bot del canal de voz',
  async execute(message, args, client) {
    // Prioridad: si este bot no está activo en el servidor, ignorar silenciosamente
    if (!isBotActiveInGuild(client, message.guild)) return;

    const queue = client.queues.get(message.guild.id);

    if (queue) {
      const { allowed, reason } = canStop(message.member, queue);
      if (!allowed) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription(reason)] });
      }
      try { queue.destroy(); } catch {}
      client.queues.delete(message.guild.id);
      return message.reply({
        embeds: [new EmbedBuilder().setColor('#95A5A6').setDescription('👋 **Desconectado y cola limpiada.**').setFooter({ text: 'LEGADO MUSIC' })]
      });
    }

    const voiceState = message.guild.members.cache.get(client.user.id)?.voice;
    if (voiceState?.channel) {
      try { voiceState.disconnect(); } catch {}
      return message.reply({
        embeds: [new EmbedBuilder().setColor('#95A5A6').setDescription('👋 **Desconectado del canal de voz.**').setFooter({ text: 'LEGADO MUSIC' })]
      });
    }

    message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ No estoy en ningún canal de voz.')] });
  },
};
