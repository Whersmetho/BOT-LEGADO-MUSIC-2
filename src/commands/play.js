const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const yts = require('yt-search');
const GuildQueue = require('../GuildQueue');
const spotify = require('../spotify');

const BOT_PRIORITY = parseInt(process.env.BOT_PRIORITY || '1');

// Detecta si es URL de YouTube
function isYouTubeURL(str) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/.test(str);
}

// Extrae el ID de un video de YouTube
function extractYouTubeID(url) {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

module.exports = {
  name: 'play',
  aliases: ['p'],
  description: 'Reproduce música de YouTube o Spotify',
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply('❌ Escribe el nombre o URL de una canción. Ej: `l!play despacito`');
    }

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('🎤 Debes estar en un canal de voz primero.');

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return message.reply('❌ No tengo permisos para unirme o hablar en ese canal.');
    }

    // ── Lógica de prioridad ──────────────────────────────────────────────────
    // Verifica cuántos bots hay en el canal de voz del usuario (visible para ambos bots)
    const botsInChannel = voiceChannel.members.filter(m => m.user.bot);

    if (BOT_PRIORITY === 1) {
      // Bot 1: si ya está activo en algún canal de este servidor, solo atiende
      // a usuarios de ESE canal. Si el usuario está en otro canal, ignora
      // silenciosamente para que Bot 2 lo tome.
      const existingQueue = client.queues.get(message.guild.id);
      if (existingQueue && existingQueue.voiceChannel.id !== voiceChannel.id) return;

    } else {
      // Bot 2: si ya hay algún bot en el canal del usuario, no entrar.
      // Significa que Bot 1 ya está ahí o se está uniendo.
      if (botsInChannel.size > 0) return;
    }
    // ────────────────────────────────────────────────────────────────────────

    const query = args.join(' ');
    const loadingMsg = await message.reply('🔍 Buscando...');

    try {
      // Obtener o crear la cola
      let queue = client.queues.get(message.guild.id);
      if (!queue) {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        });
        try {
          await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        } catch {
          connection.destroy();
          return loadingMsg.edit('❌ No pude conectarme al canal de voz.');
        }
        queue = new GuildQueue(voiceChannel, message.channel, connection);
        client.queues.set(message.guild.id, queue);
        connection.on(VoiceConnectionStatus.Disconnected, () => {
          client.queues.delete(message.guild.id);
        });
      }

      // ── Spotify ──────────────────────────────────────────────────────────────
      if (query.includes('open.spotify.com')) {
        const spotifyType = spotify.getSpotifyType(query);
        if (!spotifyType) return loadingMsg.edit('❌ URL de Spotify no válida.');

        if (spotifyType === 'track') {
          await loadingMsg.edit('🟢 Obteniendo canción de Spotify...');
          const [trackInfo] = await spotify.getTrack(query);
          const songInfo = await searchYouTube(trackInfo, message.author.username);
          if (!songInfo) return loadingMsg.edit(`❌ No encontré "${trackInfo.title}" en YouTube.`);
          await queue.addSong(songInfo);
          if (queue.songs.length > 1) await loadingMsg.edit(`➕ **${songInfo.title}** añadido a la cola.`);
          else await loadingMsg.delete().catch(() => {});

        } else if (spotifyType === 'playlist') {
          await loadingMsg.edit('🟢 Cargando playlist de Spotify...');
          const { tracks, playlistName, total } = await spotify.getPlaylist(query);
          await loadingMsg.edit(`📋 **${playlistName}** — ${total} canciones. Añadiendo...`);
          let added = 0;
          for (const t of tracks) {
            const s = await searchYouTube(t, message.author.username);
            if (s) { await queue.addSong(s); added++; }
          }
          await loadingMsg.edit(`✅ Playlist **${playlistName}** — ${added}/${total} canciones añadidas.`);

        } else if (spotifyType === 'album') {
          await loadingMsg.edit('🟢 Cargando álbum de Spotify...');
          const { tracks, albumName, total } = await spotify.getAlbum(query);
          await loadingMsg.edit(`💿 **${albumName}** — ${total} canciones. Añadiendo...`);
          let added = 0;
          for (const t of tracks) {
            const s = await searchYouTube(t, message.author.username);
            if (s) { await queue.addSong(s); added++; }
          }
          await loadingMsg.edit(`✅ Álbum **${albumName}** — ${added}/${total} canciones añadidas.`);
        }

      // ── URL directa de YouTube ───────────────────────────────────────────────
      } else if (isYouTubeURL(query)) {
        const videoId = extractYouTubeID(query);
        if (!videoId) return loadingMsg.edit('❌ URL de YouTube no válida.');

        const result = await yts({ videoId });
        const songInfo = {
          title: result.title || 'Canción de YouTube',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          duration: result.timestamp || '??:??',
          requestedBy: message.author.username,
        };

        await queue.addSong(songInfo);
        if (queue.songs.length > 1) {
          await loadingMsg.edit(`➕ **${songInfo.title}** (${songInfo.duration}) añadido a la cola.`);
        } else {
          await loadingMsg.delete().catch(() => {});
        }

      // ── Búsqueda por texto ───────────────────────────────────────────────────
      } else {
        const results = await yts(query);
        const video = results.videos[0];
        if (!video) return loadingMsg.edit('❌ No se encontraron resultados.');

        const songInfo = {
          title: video.title,
          url: video.url,
          duration: video.timestamp,
          requestedBy: message.author.username,
        };

        await queue.addSong(songInfo);
        if (queue.songs.length > 1) {
          await loadingMsg.edit(`➕ **${songInfo.title}** (${songInfo.duration}) añadido a la cola.`);
        } else {
          await loadingMsg.delete().catch(() => {});
        }
      }

    } catch (err) {
      console.error('Error en play:', err.message);
      loadingMsg.edit('❌ Ocurrió un error. Revisa la consola para más detalles.');
    }
  },
};

async function searchYouTube(trackInfo, requestedBy) {
  try {
    const results = await yts(trackInfo.searchQuery);
    const video = results.videos[0];
    if (!video) return null;
    return {
      title: trackInfo.title,
      url: video.url,
      duration: trackInfo.duration,
      requestedBy,
    };
  } catch { return null; }
}
