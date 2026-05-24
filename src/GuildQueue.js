const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
} = require('@discordjs/voice');
const { spawn } = require('child_process');
const { EmbedBuilder } = require('discord.js');
const { getRelatedVideos } = require('./autoplay');
const ffmpegPath = require('ffmpeg-static');

function nowPlayingEmbed(song, autoplay = false) {
  return new EmbedBuilder()
    .setColor('#9B59B6')
    .setAuthor({ name: '▶️ Reproduciendo ahora' })
    .setTitle(song.title)
    .setURL(song.url)
    .setThumbnail(`https://img.youtube.com/vi/${extractID(song.url)}/hqdefault.jpg`)
    .addFields(
      { name: '⏱️ Duración', value: song.duration || '??:??', inline: true },
      { name: '🎧 Pedido por', value: song.requestedBy || 'Autoplay', inline: true },
      { name: '🔀 Autoplay', value: autoplay ? 'Activado' : 'Desactivado', inline: true }
    )
    .setFooter({ text: 'LEGADO MUSIC' })
    .setTimestamp();
}

function queueEmbed(song, position) {
  return new EmbedBuilder()
    .setColor('#3498DB')
    .setAuthor({ name: `➕ Añadido a la cola — Posición #${position}` })
    .setTitle(song.title)
    .setURL(song.url)
    .setThumbnail(`https://img.youtube.com/vi/${extractID(song.url)}/hqdefault.jpg`)
    .addFields(
      { name: '⏱️ Duración', value: song.duration || '??:??', inline: true },
      { name: '🎧 Pedido por', value: song.requestedBy || 'Desconocido', inline: true }
    )
    .setFooter({ text: 'LEGADO MUSIC' });
}

function extractID(url) {
  const match = url?.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : '';
}

const nodePath = process.execPath;
const MAX_HISTORY = 50;

class GuildQueue {
  constructor(voiceChannel, textChannel, connection) {
    this.voiceChannel = voiceChannel;
    this.textChannel = textChannel;
    this.connection = connection;
    this.songs = [];
    this.playing = false;
    this.loop = false;
    this.autoplay = false;
    this.lastSong = null;
    this.history = [];
    this.relatedPool = [];
    this.destroyed = false;
    this.player = createAudioPlayer();
    this.ytdlpProc = null;
    this.ffmpegProc = null;
    this.nextYtdlp = null;
    this.nextFfmpeg = null;
    this.prefetchSong = null;
    this.prefetchTimeout = null;

    connection.subscribe(this.player);

    // Manejar desconexión sin crash
    connection.on(VoiceConnectionStatus.Destroyed, () => {
      this.destroyed = true;
      this._killProcesses();
      this._cancelPrefetch();
    });

    this.player.on(AudioPlayerStatus.Idle, async () => {
      if (this.destroyed) return;

      if (this.loop && this.songs.length > 0) {
        this._play(this.songs[0]);
      } else {
        const finished = this.songs.shift();
        if (finished) {
          this.lastSong = finished;
          this.history.push(finished.url);
          if (this.history.length > MAX_HISTORY) this.history.shift();
        }

        if (this.songs.length > 0) {
          await this._playWithPrefetch();
        } else if (this.autoplay && this.lastSong) {
          await this._playRelated();
        } else {
          this.playing = false;
          this._cancelPrefetch();
          this.textChannel.send({
            embeds: [new EmbedBuilder().setColor('#2ECC71').setDescription('✅ **Cola vacía. ¡Hasta la próxima!**').setFooter({ text: 'LEGADO MUSIC' })]
          });
          setTimeout(() => {
            if (!this.playing && !this.destroyed) {
              try { this.connection.destroy(); } catch {}
            }
          }, 30000);
        }
      }
    });

    this.player.on('error', (err) => {
      console.error('Player error:', err.message);
      this._killProcesses();
      this._cancelPrefetch();
      this.songs.shift();
      if (this.songs.length > 0) this._playWithPrefetch();
    });
  }

  _spawnYtdlp(url) {
    console.log(`▶️ yt-dlp iniciando: ${url}`);
    console.log(`   Node path: ${nodePath}`);
    const cookiesPath = require('path').join(process.cwd(), 'cookies.txt');
    const fs = require('fs');
    const cookiesArgs = fs.existsSync(cookiesPath) ? ['--cookies', cookiesPath] : [];
    return spawn('yt-dlp', [
      ...cookiesArgs,
      '--js-runtimes', `node:${nodePath}`,
      '-f', 'bestaudio/best',
      '-o', '-',
      '--no-playlist',
      '--quiet',
      '--no-warnings',
      url,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
  }

  _spawnFfmpeg() {
    return spawn(ffmpegPath, [
      '-i', 'pipe:0',
      '-analyzeduration', '0',
      '-loglevel', 'error',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'ignore'] });
  }

  _prefetchNext() {
    if (this.songs.length < 2) return;
    const nextSong = this.songs[1];
    if (!nextSong) return;
    this._cancelPrefetch();

    this.prefetchTimeout = setTimeout(() => {
      try {
        const ffmpeg = this._spawnFfmpeg();
        const ytdlp = this._spawnYtdlp(nextSong.url);

        ytdlp.stdout.pipe(ffmpeg.stdin, { end: true });
        ytdlp.stdout.on('error', () => {});
        ytdlp.stderr.on('data', (d) => console.error('yt-dlp prefetch err:', d.toString().trim()));
        ffmpeg.stdin.on('error', () => {});
        ffmpeg.stdout.on('error', () => {});

        this.nextYtdlp = ytdlp;
        this.nextFfmpeg = ffmpeg;
        this.prefetchSong = nextSong;
      } catch (e) {
        console.error('Error en prefetch:', e.message);
      }
    }, 3000);
  }

  _cancelPrefetch() {
    if (this.prefetchTimeout) { clearTimeout(this.prefetchTimeout); this.prefetchTimeout = null; }
    try { if (this.nextFfmpeg) { this.nextFfmpeg.kill('SIGKILL'); this.nextFfmpeg = null; } } catch {}
    try { if (this.nextYtdlp) { this.nextYtdlp.kill('SIGKILL'); this.nextYtdlp = null; } } catch {}
    this.prefetchSong = null;
  }

  async _playWithPrefetch() {
    const song = this.songs[0];
    if (this.nextFfmpeg && this.nextYtdlp && this.prefetchSong?.url === song.url) {
      this._killProcesses();
      const ffmpeg = this.nextFfmpeg;
      const ytdlp = this.nextYtdlp;
      this.nextFfmpeg = null;
      this.nextYtdlp = null;
      this.prefetchSong = null;
      this.ytdlpProc = ytdlp;
      this.ffmpegProc = ffmpeg;
      const resource = createAudioResource(ffmpeg.stdout, { inputType: StreamType.Raw });
      this.player.play(resource);
      this.textChannel.send({ embeds: [nowPlayingEmbed(song, this.autoplay)] });
      this._prefetchNext();
    } else {
      await this._play(song);
    }
  }

  async _playRelated() {
    try {
      this.textChannel.send({
        embeds: [new EmbedBuilder().setColor('#9B59B6').setDescription('🔀 **Buscando canción relacionada...**')]
      });

      if (this.relatedPool.length < 2) {
        const related = await getRelatedVideos(this.lastSong.url, this.lastSong.title, this.history);
        if (related.length > 0) this.relatedPool = related.sort(() => Math.random() - 0.5);
      }

      let song = null;
      while (this.relatedPool.length > 0) {
        const candidate = this.relatedPool.shift();
        if (!this.history.includes(candidate.url)) { song = candidate; break; }
      }

      if (!song) {
        this.playing = false;
        this.textChannel.send({
          embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ No encontré canciones relacionadas nuevas.')]
        });
        setTimeout(() => { if (!this.playing && !this.destroyed) { try { this.connection.destroy(); } catch {} } }, 30000);
        return;
      }

      this.songs.push(song);
      await this._play(song);

      if (this.relatedPool.length < 3) {
        getRelatedVideos(song.url, song.title, this.history).then(more => {
          this.relatedPool.push(...more.filter(v => !this.history.includes(v.url)).sort(() => Math.random() - 0.5));
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Error en autoplay:', err.message);
      this.playing = false;
    }
  }

  _killProcesses() {
    try { if (this.ffmpegProc) { this.ffmpegProc.kill('SIGKILL'); this.ffmpegProc = null; } } catch {}
    try { if (this.ytdlpProc) { this.ytdlpProc.kill('SIGKILL'); this.ytdlpProc = null; } } catch {}
  }

  async addSong(song, silent = false) {
    const position = this.songs.length;
    this.songs.push(song);
    if (!this.playing) {
      this.playing = true;
      await this._play(this.songs[0]);
      this._prefetchNext();
    } else if (!silent && position > 0) {
      this.textChannel.send({ embeds: [queueEmbed(song, position)] });
      if (position === 1) this._prefetchNext();
    }
  }

  async _play(song) {
    this._killProcesses();
    try {
      const ffmpeg = this._spawnFfmpeg();
      const ytdlp = this._spawnYtdlp(song.url);

      this.ytdlpProc = ytdlp;
      this.ffmpegProc = ffmpeg;

      ytdlp.stdout.pipe(ffmpeg.stdin, { end: true });
      ytdlp.stdout.on('error', () => {});
      ytdlp.stderr.on('data', (d) => console.error('yt-dlp err:', d.toString().trim()));
      ffmpeg.stdin.on('error', () => {});
      ffmpeg.stdout.on('error', () => {});

      ytdlp.on('exit', (code) => {
        if (code !== 0 && code !== null) console.error(`yt-dlp salió con código ${code} para ${song.url}`);
        else console.log(`yt-dlp completado OK para: ${song.title}`);
      });

      const resource = createAudioResource(ffmpeg.stdout, { inputType: StreamType.Raw });
      this.player.play(resource);
      this.textChannel.send({ embeds: [nowPlayingEmbed(song, this.autoplay)] });
      this._prefetchNext();

    } catch (err) {
      console.error('Error al reproducir:', err.message);
      this.textChannel.send({
        embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('❌ **No se pudo reproducir esta canción. Saltando...**')]
      });
      this._killProcesses();
      this.songs.shift();
      if (this.songs.length > 0) this._playWithPrefetch();
    }
  }

  skip() { this._cancelPrefetch(); this._killProcesses(); this.player.stop(); }
  pause() { return this.player.pause(); }
  resume() { return this.player.unpause(); }

  stop() {
    this._cancelPrefetch();
    this._killProcesses();
    this.songs = [];
    this.loop = false;
    this.autoplay = false;
    this.history = [];
    this.relatedPool = [];
    this.player.stop();
    this.playing = false;
  }

  destroy() {
    this.destroyed = true;
    this.stop();
    try { this.connection.destroy(); } catch {}
  }

  toggleLoop() { this.loop = !this.loop; return this.loop; }
  toggleAutoplay() { this.autoplay = !this.autoplay; return this.autoplay; }
  getNowPlaying() { return this.songs[0] || null; }
  getQueue() { return this.songs.slice(1); }
}

module.exports = GuildQueue;
