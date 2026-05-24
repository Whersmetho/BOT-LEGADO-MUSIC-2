const { EmbedBuilder } = require('discord.js');
module.exports = {
  name: 'help',
  description: 'Muestra todos los comandos',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setAuthor({ name: '🎵 LEGADO MUSIC — Comandos' })
      .addFields(
        {
          name: '▶️ Reproducción',
          value: [
            '`l!play <nombre o URL>` — Reproduce de YouTube o Spotify',
            '`l!pause` — Pausa la música',
            '`l!resume` — Reanuda la música',
            '`l!skip` — Salta la canción actual',
            '`l!stop` — Detiene todo y limpia la cola',
          ].join('\n'),
        },
        {
          name: '📋 Cola',
          value: [
            '`l!queue` — Ver la cola completa',
            '`l!nowplaying` — Ver qué está sonando',
            '`l!loop` — Activar/desactivar bucle',
            '`l!autoplay` — Activar/desactivar autoplay',
          ].join('\n'),
        },
        {
          name: '🔌 Conexión',
          value: '`l!leave` — Desconectar el bot',
        },
        {
          name: '⚡ Aliases rápidos',
          value: '`l!p` `l!s` `l!q` `l!np` `l!r` `l!ap` `l!dc`',
        }
      )
      .setFooter({ text: 'LEGADO MUSIC • Soporta YouTube y Spotify' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
