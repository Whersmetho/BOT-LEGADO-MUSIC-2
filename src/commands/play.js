const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
} = require('@discordjs/voice');

const {
  EmbedBuilder
} = require('discord.js');

const play = require('play-dl');

const { GuildQueue } = require('../structures/GuildQueue');
const { canControl } = require('../permissions');

module.exports = {
  name: 'play',
  aliases: ['p'],
  description: 'Reproduce música',

  async execute(message, args, client) {

    if (!args.length) {
      return message.reply('❌ Debes escribir una canción.');
    }

    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      return message.reply('❌ Debes entrar a un canal de voz.');
    }

    // BOT 2 espera para evitar doble conexión
    await new Promise(r => setTimeout(r, 1500));

    // Revisar si ya hay otro bot conectado
    const existingBots = voiceChannel.members.filter(
      m =>
        m.user.bot &&
        m.id !== client.user.id
    );

    // Si ya hay otro bot conectado, cancelar
    if (existingBots.size > 0) {
      return;
    }

    const queueKey = `${message.guild.id}-${client.user.id}`;

    let queue = client.queues.get(queueKey);

    try {

      const query = args.join(' ');

      const searchResult = await play.search(query, {
        limit: 1
      });

      if (!searchResult.length) {
        return message.reply('❌ No encontré resultados.');
      }

      const song = {
        title: searchResult[0].title,
        url: searchResult[0].url,
        duration: searchResult[0].durationRaw,
        thumbnail: searchResult[0].thumbnails?.[0]?.url,
        requestedBy: message.author.id,
        requestedByName: message.author.username,
      };

      // Crear queue
      if (!queue) {

        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        });

        queue = new GuildQueue(
          voiceChannel,
          message.channel,
          connection
        );

        queue.ownerId = message.author.id;
        queue.ownerUsername = message.author.username;

        client.queues.set(queueKey, queue);
      }

      queue.songs.push(song);

      const embed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('🎵 Canción agregada')
        .setDescription(`[${song.title}](${song.url})`)
        .setThumbnail(song.thumbnail || null)
        .addFields({
          name: '👤 Solicitada por',
          value: message.author.username
        });

      message.reply({
        embeds: [embed]
      });

      // Si ya está reproduciendo no reiniciar
      if (queue.playing) return;

      queue.playing = true;

      playSong(queue, client);

    } catch (err) {
      console.error(err);

      message.reply('❌ Error reproduciendo canción.');
    }
  },
};

async function playSong(queue, client) {

  if (!queue.songs.length) {

    queue.playing = false;

    try {
      queue.connection.destroy();
    } catch {}

    const queueKey =
      `${queue.voiceChannel.guild.id}-${client.user.id}`;

    client.queues.delete(queueKey);

    return;
  }

  const song = queue.songs[0];

  try {

    const stream = await play.stream(song.url);

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
    });

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play
      }
    });

    queue.connection.subscribe(player);

    player.play(resource);

    player.on(AudioPlayerStatus.Idle, () => {

      queue.songs.shift();

      playSong(queue, client);
    });

    player.on('error', err => {

      console.error(err);

      queue.songs.shift();

      playSong(queue, client);
    });

  } catch (err) {

    console.error(err);

    queue.songs.shift();

    playSong(queue, client);
  }
}