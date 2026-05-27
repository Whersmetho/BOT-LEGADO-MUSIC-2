const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  NoSubscriberBehavior,
} = require('@discordjs/voice');
const { spawn } = require('child_process');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRelatedVideos } = require('./autoplay');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

const cookiesPath = path.join(process.cwd(), 'cookies.txt');
const nodePath = process.execPath;
const MAX_HISTORY = 50;

function extractID(url) {
  const match = url?.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : '';
}

function formatRequester(requestedBy) {
  if (!requestedBy) return 'Desconocido';
  if (typeof requestedBy === 'string') return requestedBy;
  return `<@${requestedBy.id}>`;
}

function nowPlayingEmbed(song, queue) {
  return new EmbedBuilder()
    .setColor('#9B59B6')
    .setAuthor({ name: '▶️ Reproduciendo ahora' })
    .setTitle(song.title)
    .setURL(song.url)
    .setThumbnail(`https://img.youtube.com/vi/${extractID(song.url)}/hqdefault.jpg`)
    .addFields(
      { name: '⏱️ Duración',   value: song.duration || '??:??', inline: true },
      { name: '🎧 Pedido por', value: formatRequester(song.requestedBy), inline: true },
      { name: '🔀 Autoplay',   value: queue.autoplay ? 'Activado' : 'Desactivado', inline: true }
    )
    .setFooter({ text: `LEGADO MUSIC • ${queue.songs.length > 1 ? `${queue.songs.length - 1} en cola` : 'Cola vacía'}` })
    .setTimestamp();
}

function nowPlayingButtons(queue) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_pause').setEmoji('⏸️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('btn_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('btn_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('btn_loop').setEmoji('🔁').setStyle(queue.loop ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('btn_autoplay').setEmoji('🔀').setStyle(queue.autoplay ? ButtonStyle.Primary : ButtonStyle.Secondary),
  );
}

function queueEmbed(song, position) {
  return new EmbedBuilder()
    .setColor('#3498DB')
    .setAuthor({ name: `➕ Añadido a la cola — Posición #${position}` })
    .setTitle(song.title)
    .setURL(song.url)
    .setThumbnail(`https://img.youtube.com/vi/${extractID(song.url)}/hqdefault.jpg`)
    .addFields(
      { name: '⏱️ Duración',   value: song.duration || '??:??', inline: true },
      { name: '🎧 Pedido por', value: formatRequester(song.requestedBy), inline: true }
    )
    .setFooter({ text: 'LEGADO MUSIC' });
}

// Espera a que el stream de ffmpeg tenga datos reales antes de dárselo al player
function waitForData(stream, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout esperando datos de audio')), timeout);
    stream.once('data', () => {
      clearTimeout(timer);
      stream.unshift !== undefined; // no-op, solo para que no se pierda el chunk
      resolve();
    });
    stream.once('error', (err) => { clearTimeout(timer); reject(err); });
    stream.once('end',   ()    => { clearTimeout(timer); reject(new Error('Stream terminó sin datos')); });
  });
}

class GuildQueue {
  constructor(voiceChannel, textChannel, connection) {
    this.voiceChannel = voiceChannel;
    this.textChannel  = textChannel;
    this.connection   = connection;
    this.songs        = [];
    this.playing      = false;
    this.loop         = false;
    this.autoplay     = false;
    this.lastSong     = null;
    this.history      = [];
    this.relatedPool  = [];
    this.destroyed    = false;
    this.nowPlayingMsg = null;
    this.ytdlpProc    = null;
    this.ffmpegProc   = null;
    this.nextYtdlp    = null;
    this.nextFfmpeg   = null;
    this.prefetchSong = null;
    this.prefetchTimeout = null;

    // Behavior: pausar en vez de destruirse si no hay suscriptores
    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });

    connection.subscribe(this.player);

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      this.destroyed = true;
      this._killProcesses();
      this._cancelPrefetch();
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      await new Promise(r => setTimeout(r, 2000));
      if (this.destroyed) return;
      if ([
        VoiceConnectionStatus.Ready,
        VoiceConnectionStatus.Connecting,
        VoiceConnectionStatus.Signalling,
      ].includes(connection.state.status)) return;

      this.destroyed = true;
      this._killProcesses();
      this._cancelPrefetch();
      this._disableNowPlayingButtons();
      this.songs   = [];
      this.playing = false;

      try {
        this.textChannel.send({ embeds: [
          new EmbedBuilder()
            .setColor('#E74C3C')
            .setDescription('👢 **Me kickearon del canal de voz.** Cola limpiada.')
            .setFooter({ text: 'LEGADO MUSIC' })
        ]});
      } catch {}
      try { connection.destroy(); } catch {}
    });

    this.player.on(AudioPlayerStatus.Idle, async () => {
      if (this.destroyed) return;

      this._disableNowPlayingButtons();

      if (this.loop && this.songs.length > 0) {
        this._play(this.songs[0]);
        return;
      }

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
        this.textChannel.send({ embeds: [
          new EmbedBuilder()
            .setColor('#2ECC71')
            .setDescription('✅ **Cola vacía. ¡Hasta la próxima!**')
            .setFooter({ text: 'LEGADO MUSIC' })
        ]});
        setTimeout(() => {
          if (!this.playing && !this.destroyed) {
            try { this.connection.destroy(); } catch {}
          }
        }, 30000);
      }
    });

    this.player.on('error', (err) => {
      console.error('Player error:', err.message);
      this._disableNowPlayingButtons();
      this._killProcesses();
      this._cancelPrefetch();
      this.songs.shift();
      if (this.songs.length > 0) this._playWithPrefetch();
      else {
        this.playing = false;
        this.textChannel.send({ embeds: [
          new EmbedBuilder().setColor('#E74C3C').setDescription('❌ **Error de reproducción.**')
        ]});
      }
    });
  }

  async _disableNowPlayingButtons() {
    if (!this.nowPlayingMsg) return;
    try {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_pause').setEmoji('⏸️').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('btn_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('btn_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger).setDisabled(true),
        new ButtonBuilder().setCustomId('btn_loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('btn_autoplay').setEmoji('🔀').setStyle(ButtonStyle.Secondary).setDisabled(true),
      );
      await this.nowPlayingMsg.edit({ components: [row] });
    } catch {}
    this.nowPlayingMsg = null;
  }

  _spawnYtdlp(url) {
    console.log(`▶️ yt-dlp: ${url}`);

    const cookiesArgs = fs.existsSync(cookiesPath) ? ['--cookies', cookiesPath] : [];

    // Ruta al servidor de PO Token (bgutil-yt-dlp-pot-provider)
    const potProviderPath = path.join(process.cwd(), 'node_modules/bgutil-yt-dlp-pot-provider/build/server.js');
    const potArgs = fs.existsSync(potProviderPath)
      ? ['--extractor-args', `youtube:pot_provider=bgutil;pot_server_host=127.0.0.1;pot_server_port=4416`]
      : [];

    return spawn('yt-dlp', [
      ...cookiesArgs,
      ...potArgs,
      '-f', 'bestaudio',
      '-o', '-',
      '--no-playlist',
      '--quiet',
      '--no-warnings',
      '--extractor-retries', '3',
      '--no-check-certificates',
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
        const ytdlp  = this._spawnYtdlp(nextSong.url);
        ytdlp.stdout.pipe(ffmpeg.stdin, { end: true });
        ytdlp.stdout.on('error', () => {});
        ytdlp.stderr.on('data', d => console.error('yt-dlp prefetch:', d.toString().trim()));
        ffmpeg.stdin.on('error', () => {});
        ffmpeg.stdout.on('error', () => {});
        this.nextYtdlp   = ytdlp;
        this.nextFfmpeg  = ffmpeg;
        this.prefetchSong = nextSong;
      } catch (e) {
        console.error('Error en prefetch:', e.message);
      }
    }, 3000);
  }

  _cancelPrefetch() {
    if (this.prefetchTimeout) { clearTimeout(this.prefetchTimeout); this.prefetchTimeout = null; }
    try { if (this.nextFfmpeg) { this.nextFfmpeg.kill('SIGKILL'); this.nextFfmpeg = null; } } catch {}
    try { if (this.nextYtdlp)  { this.nextYtdlp.kill('SIGKILL');  this.nextYtdlp  = null; } } catch {}
    this.prefetchSong = null;
  }

  async _playWithPrefetch() {
    const song = this.songs[0];
    if (this.nextFfmpeg && this.nextYtdlp && this.prefetchSong?.url === song.url) {
      this._killProcesses();
      const ffmpeg = this.nextFfmpeg;
      const ytdlp  = this.nextYtdlp;
      this.nextFfmpeg = null; this.nextYtdlp = null; this.prefetchSong = null;
      this.ytdlpProc = ytdlp; this.ffmpegProc = ffmpeg;

      const resource = createAudioResource(ffmpeg.stdout, { inputType: StreamType.Raw });
      this.player.play(resource);
      this.nowPlayingMsg = await this.textChannel.send({
        embeds: [nowPlayingEmbed(song, this)],
        components: [nowPlayingButtons(this)],
      });
      this._prefetchNext();
    } else {
      await this._play(song);
    }
  }

  async _playRelated() {
    try {
      this.textChannel.send({ embeds: [
        new EmbedBuilder().setColor('#9B59B6').setDescription('🔀 **Buscando canción relacionada...**')
      ]});

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
        this.textChannel.send({ embeds: [
          new EmbedBuilder().setColor('#E74C3C').setDescription('❌ No encontré canciones relacionadas nuevas.')
        ]});
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
    try { if (this.ytdlpProc)  { this.ytdlpProc.kill('SIGKILL');  this.ytdlpProc  = null; } } catch {}
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
      const ytdlp  = this._spawnYtdlp(song.url);
      this.ytdlpProc  = ytdlp;
      this.ffmpegProc = ffmpeg;

      ytdlp.stdout.pipe(ffmpeg.stdin, { end: true });
      ytdlp.stdout.on('error', () => {});
      ytdlp.stderr.on('data', d => console.error('yt-dlp err:', d.toString().trim()));
      ffmpeg.stdin.on('error', () => {});
      ffmpeg.stdout.on('error', () => {});

      ytdlp.on('exit', code => {
        if (code !== 0 && code !== null) console.error(`yt-dlp salió con código ${code}`);
      });

      // ── FIX PRINCIPAL: esperar primer chunk antes de crear el resource ──
      await waitForData(ffmpeg.stdout);
      // ────────────────────────────────────────────────────────────────────

      const resource = createAudioResource(ffmpeg.stdout, { inputType: StreamType.Raw });
      this.player.play(resource);

      this.nowPlayingMsg = await this.textChannel.send({
        embeds: [nowPlayingEmbed(song, this)],
        components: [nowPlayingButtons(this)],
      });

      this._prefetchNext();
    } catch (err) {
      console.error('Error al reproducir:', err.message);
      this.textChannel.send({ embeds: [
        new EmbedBuilder().setColor('#E74C3C').setDescription('❌ **No se pudo reproducir esta canción. Saltando...**')
      ]});
      this._killProcesses();
      this.songs.shift();
      if (this.songs.length > 0) this._playWithPrefetch();
      else this.playing = false;
    }
  }

  skip()   { this._cancelPrefetch(); this._killProcesses(); this.player.stop(); }
  pause()  { return this.player.pause(); }
  resume() { return this.player.unpause(); }

  stop() {
    this._cancelPrefetch();
    this._killProcesses();
    this._disableNowPlayingButtons();
    this.songs      = [];
    this.loop       = false;
    this.autoplay   = false;
    this.history    = [];
    this.relatedPool = [];
    this.player.stop();
    this.playing = false;
  }

  destroy() {
    this.destroyed = true;
    this.stop();
    try { this.connection.destroy(); } catch {}
  }

  toggleLoop()     { this.loop     = !this.loop;     return this.loop; }
  toggleAutoplay() { this.autoplay = !this.autoplay; return this.autoplay; }
  getNowPlaying()  { return this.songs[0] || null; }
  getQueue()       { return this.songs.slice(1); }
}

module.exports = GuildQueue;

// Helper — espera el primer chunk del stream de ffmpeg
function waitForData(stream, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout: yt-dlp/ffmpeg no produjo audio'));
    }, timeout);

    function onData(chunk) {
      cleanup();
      // Devolver el chunk al stream para que el AudioResource lo consuma
      stream.unshift(chunk);
      resolve();
    }
    function onError(err) { cleanup(); reject(err); }
    function onEnd()      { cleanup(); reject(new Error('Stream terminó sin datos')); }
    function cleanup() {
      clearTimeout(timer);
      stream.removeListener('data',  onData);
      stream.removeListener('error', onError);
      stream.removeListener('end',   onEnd);
    }

    stream.once('data',  onData);
    stream.once('error', onError);
    stream.once('end',   onEnd);
  });
}
