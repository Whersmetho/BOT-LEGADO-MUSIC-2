const SpotifyWebApi = require('spotify-web-api-node');

let spotifyApi = null;
let tokenExpiresAt = 0;

function initSpotify(clientId, clientSecret) {
  spotifyApi = new SpotifyWebApi({ clientId, clientSecret });
}

async function ensureToken() {
  if (Date.now() < tokenExpiresAt) return;
  const data = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(data.body.access_token);
  // Renovar 1 minuto antes de que expire
  tokenExpiresAt = Date.now() + (data.body.expires_in - 60) * 1000;
}

// Detecta qué tipo de URL de Spotify es
function getSpotifyType(url) {
  if (url.includes('/track/'))    return 'track';
  if (url.includes('/playlist/')) return 'playlist';
  if (url.includes('/album/'))    return 'album';
  return null;
}

// Extrae el ID de la URL
function extractId(url) {
  const match = url.match(/\/(track|playlist|album)\/([A-Za-z0-9]+)/);
  return match ? match[2] : null;
}

// Convierte un track de Spotify a objeto de búsqueda
function trackToSearchQuery(track) {
  const artists = track.artists.map(a => a.name).join(', ');
  return {
    searchQuery: `${track.name} ${artists}`,
    title: `${track.name} — ${artists}`,
    duration: formatDuration(Math.floor(track.duration_ms / 1000)),
  };
}

// Canción individual
async function getTrack(url) {
  await ensureToken();
  const id = extractId(url);
  const data = await spotifyApi.getTrack(id);
  const track = data.body;
  return [trackToSearchQuery(track)];
}

// Playlist (máx 100 canciones por llamada, paginamos)
async function getPlaylist(url) {
  await ensureToken();
  const id = extractId(url);

  const meta = await spotifyApi.getPlaylist(id, { fields: 'name,tracks.total' });
  const total = meta.body.tracks.total;
  const playlistName = meta.body.name;

  const tracks = [];
  let offset = 0;
  const limit = 100;

  while (offset < total && offset < 500) { // límite de seguridad: 500 canciones
    const data = await spotifyApi.getPlaylistTracks(id, {
      offset,
      limit,
      fields: 'items(track(name,artists,duration_ms))',
    });
    for (const item of data.body.items) {
      if (item.track) tracks.push(trackToSearchQuery(item.track));
    }
    offset += limit;
  }

  return { tracks, playlistName, total: tracks.length };
}

// Álbum
async function getAlbum(url) {
  await ensureToken();
  const id = extractId(url);

  const data = await spotifyApi.getAlbum(id);
  const album = data.body;
  const albumName = `${album.name} — ${album.artists.map(a => a.name).join(', ')}`;

  const tracks = album.tracks.items.map(track => ({
    searchQuery: `${track.name} ${track.artists.map(a => a.name).join(' ')}`,
    title: `${track.name} — ${track.artists.map(a => a.name).join(', ')}`,
    duration: formatDuration(Math.floor(track.duration_ms / 1000)),
  }));

  return { tracks, albumName, total: tracks.length };
}

function formatDuration(seconds) {
  if (!seconds) return '??:??';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

module.exports = { initSpotify, getSpotifyType, getTrack, getPlaylist, getAlbum };
