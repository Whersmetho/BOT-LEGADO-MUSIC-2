const { EmbedBuilder } = require('discord.js');

// Lista en memoria de dominios bloqueados activos por servidor
// (en producción podrías guardarlo en una base de datos)

module.exports = {
  name: 'automod',
  description: 'Configura el AutoMod (solo Admins)',
  async execute(message, args, client) {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ Solo los administradores pueden usar este comando.')]
      });
    }

    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'status') {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#9B59B6')
            .setAuthor({ name: '🛡️ AutoMod — Estado' })
            .setDescription('El AutoMod está **activo** y bloqueando links de contenido adulto automáticamente.')
            .addFields(
              { name: '✅ Qué bloquea', value: 'Links de sitios adultos (PornHub, OnlyFans, etc.)' },
              { name: '👮 Quién está exento', value: 'Admins y usuarios con permiso de "Gestionar Mensajes"' },
            )
            .setFooter({ text: 'LEGADO MUSIC • AutoMod' })
        ]
      });
    }

    message.reply({
      embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ Subcomando no reconocido. Usa `l!automod status`')]
    });
  },
};
