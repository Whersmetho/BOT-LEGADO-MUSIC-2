const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function extractID(url) {
  const match = url?.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : '';
}

function formatRequester(requestedBy) {
  if (!requestedBy) return 'Desconocido';
  if (typeof requestedBy === 'string') return requestedBy;
  return `<@${requestedBy.id}>`;
}

function buildQueueEmbed(queue, page) {
  const now = queue.getNowPlaying();
  const upcoming = queue.getQueue();
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(upcoming.length / perPage));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * perPage;
  const slice = upcoming.slice(start, start + perPage);

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setAuthor({ name: '📋 Cola de reproducción' })
    .setThumbnail(`https://img.youtube.com/vi/${extractID(now.url)}/hqdefault.jpg`)
    .setFooter({ text: `LEGADO MUSIC • Página ${safePage + 1}/${totalPages} • ${upcoming.length + 1} canción(es)` })
    .setTimestamp();

  embed.addFields({
    name: '▶️ Reproduciendo ahora',
    value: `[${now.title}](${now.url}) • \`${now.duration}\` • ${formatRequester(now.requestedBy)}`,
  });

  if (slice.length > 0) {
    embed.addFields({
      name: '⏭️ A continuación',
      value: slice.map((s, i) =>
        `\`${start + i + 1}.\` [${s.title}](${s.url}) • \`${s.duration}\` • ${formatRequester(s.requestedBy)}`
      ).join('\n'),
    });
  } else {
    embed.addFields({ name: '⏭️ A continuación', value: '_No hay más canciones en cola._' });
  }

  if (queue.loop) embed.addFields({ name: '🔁 Bucle', value: 'Activado', inline: true });
  if (queue.autoplay) embed.addFields({ name: '🔀 Autoplay', value: 'Activado', inline: true });

  return { embed, totalPages, safePage };
}

function buildQueueButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`queue_prev_${page}`)
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`queue_next_${page}`)
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}

module.exports = {
  name: 'queue',
  aliases: ['q'],
  description: 'Muestra la cola de canciones',
  async execute(message, args, client) {
    const queueKey = `${message.guild.id}-${client.user.id}`;
    const queue = client.queues.get(queueKey);

    if (!queue || queue.songs.length === 0) return;

    const userChannel = message.member.voice.channel;
    if (!userChannel || userChannel.id !== queue.voiceChannel.id) return;

    let page = 0;
    const { embed, totalPages, safePage } = buildQueueEmbed(queue, page);
    const components = totalPages > 1 ? [buildQueueButtons(safePage, totalPages)] : [];

    const reply = await message.reply({ embeds: [embed], components });

    if (totalPages <= 1) return;

    const collector = reply.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: '❌ Solo quien ejecutó el comando puede cambiar la página.', ephemeral: true });
      }

      if (i.customId.startsWith('queue_prev_')) page = Math.max(0, page - 1);
      if (i.customId.startsWith('queue_next_')) page = Math.min(totalPages - 1, page + 1);

      const { embed: newEmbed, totalPages: tp, safePage: sp } = buildQueueEmbed(queue, page);
      await i.update({ embeds: [newEmbed], components: [buildQueueButtons(sp, tp)] });
    });

    collector.on('end', () => {
      reply.edit({ components: [] }).catch(() => {});
    });
  },
};
