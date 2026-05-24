const yts = require('yt-search');
const { spawn } = require('child_process');

function extractID(url) {
  const match = url?.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : '';
}

function formatDuration(seconds) {
  if (!seconds) return '??:??';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function cleanTitle(title) {
  return title
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/official|video|lyrics|lyric|hd|hq|mv|audio|visualizer/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractArtist(title) {
  // "Artista - Canción" o "Artista: Canción"
  const parts = title.split(/\s[-–:]\s/);
  return parts.length > 1 ? parts[0].trim() : cleanTitle(title).split(' ').slice(0, 2).join(' ');
}

// Intenta obtener el mix de YouTube via yt-dlp
function tryYtdlpMix(videoId, history) {
  return new Promise((resolve) => {
    const mixUrl = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
    const ytdlp = spawn('yt-dlp', [
      '--js-runtimes', 'node',
      '--flat-playlist',
      '--playlist-start', '2',
      '--playlist-end', '20',
      '-J',
      '--no-warnings',
      '--quiet',
      mixUrl,
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    let output = '';
    ytdlp.stdout.on('data', d => output += d.toString());
    ytdlp.on('close', () => {
      try {
        const data = JSON.parse(output);
        const historySet = new Set(history);
        const videos = (data.entries || [])
          .filter(e => e?.id && e?.title)
          .map(e => ({
            url: `https://www.youtube.com/watch?v=${e.id}`,
            title: e.title,
            duration: formatDuration(e.duration),
            requestedBy: '🤖 Autoplay',
          }))
          .filter(v => !historySet.has(v.url))
          .sort(() => Math.random() - 0.5);
        resolve(videos);
      } catch { resolve([]); }
    });
    ytdlp.on('error', () => resolve([]));
    setTimeout(() => { try { ytdlp.kill(); } catch {} resolve([]); }, 15000);
  });
}

// Fallback con yts usando queries variadas y semilla aleatoria
async function tryYtsSearch(songTitle, songUrl, history) {
  const artist = extractArtist(songTitle);
  const clean = cleanTitle(songTitle);
  const historySet = new Set(history);

  // Pool de queries variadas — cada vez se eligen diferentes
  const allQueries = [
    `${artist} mix`,
    `${artist} greatest hits`,
    `${artist} playlist`,
    `${clean} remix`,
    `canciones como ${clean}`,
    `${artist} en vivo`,
    `${artist} acoustic`,
    `música similar ${artist}`,
    `top ${artist}`,
    `${artist} nuevo`,
  ];

  // Elegir 3 queries al azar cada vez (diferente cada llamada)
  const shuffled = allQueries.sort(() => Math.random() - 0.5).slice(0, 3);

  const results = [];
  const seen = new Set(history);
  seen.add(songUrl);

  await Promise.all(shuffled.map(async (q) => {
    try {
      const res = await yts(q);
      for (const v of res.videos.slice(0, 15)) {
        if (!seen.has(v.url)) {
          const parts = (v.timestamp || '0:0').split(':').map(Number);
          const secs = parts.length === 2
            ? parts[0] * 60 + parts[1]
            : parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
          if (secs >= 90 && secs <= 600) {
            seen.add(v.url);
            results.push({
              url: v.url,
              title: v.title,
              duration: v.timestamp,
              requestedBy: '🤖 Autoplay',
            });
          }
        }
      }
    } catch {}
  }));

  return results.sort(() => Math.random() - 0.5);
}

async function getRelatedVideos(songUrl, songTitle, history = []) {
  const videoId = extractID(songUrl);

  // Primero intentar con el mix real de YouTube
  if (videoId) {
    const mixResults = await tryYtdlpMix(videoId, history);
    if (mixResults.length >= 3) {
      console.log(`🔀 Autoplay (mix): ${mixResults.length} canciones`);
      return mixResults;
    }
  }

  // Fallback: búsqueda inteligente con queries variadas
  const searchResults = await tryYtsSearch(songTitle, songUrl, history);
  console.log(`🔀 Autoplay (search): ${searchResults.length} canciones`);
  return searchResults;
}

module.exports = { getRelatedVideos };
