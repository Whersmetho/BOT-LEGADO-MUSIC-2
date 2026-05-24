# 🎵 Discord Music Bot

Bot de Discord para escuchar música en canales de voz. Soporta **YouTube** y **Spotify** (canciones, playlists y álbumes).

> ⚠️ El bot no reproduce audio directamente de Spotify (DRM). Usa la API de Spotify para obtener los metadatos y luego busca el audio en YouTube automáticamente — igual que hacen todos los bots populares.

---

## ⚙️ Requisitos

- Node.js v18 o superior
- FFmpeg instalado en el sistema
- Cuenta en [Discord Developer Portal](https://discord.com/developers/applications)
- Cuenta en [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

---

## 🚀 Instalación paso a paso

### 1. Instalar dependencias
```bash
npm install
```

### 2. Instalar FFmpeg

**Linux/Ubuntu:**
```bash
sudo apt update && sudo apt install ffmpeg
```
**macOS:**
```bash
brew install ffmpeg
```
**Windows:** Descarga desde https://ffmpeg.org/download.html y agrégalo al PATH.

---

### 3. Crear el bot de Discord

1. Ve a https://discord.com/developers/applications → **New Application**
2. Sección **Bot** → **Add Bot**
3. Activa en **Privileged Gateway Intents**:
   - ✅ Message Content Intent
   - ✅ Server Members Intent
4. Copia el **Token**

---

### 4. Crear credenciales de Spotify

1. Ve a https://developer.spotify.com/dashboard
2. **Create App** → ponle cualquier nombre y descripción
3. En Redirect URIs pon `http://localhost` (solo para validación)
4. Copia el **Client ID** y el **Client Secret**

---

### 5. Configurar `config.json`

```json
{
  "token": "TU_TOKEN_DE_DISCORD",
  "spotifyClientId": "TU_SPOTIFY_CLIENT_ID",
  "spotifyClientSecret": "TU_SPOTIFY_CLIENT_SECRET"
}
```

---

### 6. Invitar el bot al servidor

1. Discord Developer Portal → **OAuth2 → URL Generator**
2. Scopes: `bot`
3. Permisos: Send Messages, Connect, Speak, Use Voice Activity
4. Abre la URL generada e invítalo a tu servidor

### 7. Ejecutar
```bash
npm start
```

---

## 🎮 Comandos

| Comando | Descripción |
|---------|-------------|
| `!play <nombre>` | Busca en YouTube y reproduce |
| `!play <URL YouTube>` | Reproduce un video de YouTube |
| `!play <URL Spotify track>` | Reproduce una canción de Spotify |
| `!play <URL Spotify playlist>` | Encola toda una playlist (máx 500) |
| `!play <URL Spotify album>` | Encola un álbum completo |
| `!pause` | Pausa la música |
| `!resume` | Reanuda la música |
| `!skip` | Salta la canción actual |
| `!stop` | Detiene todo y limpia la cola |
| `!queue` | Ver la cola (próximas 10 canciones) |
| `!nowplaying` | Ver qué está sonando |
| `!loop` | Activa/desactiva bucle de canción |
| `!leave` | Desconecta el bot |
| `!help` | Lista todos los comandos |

---

## 📁 Estructura del proyecto

```
discord-music-bot/
├── src/
│   ├── index.js           # Punto de entrada y setup
│   ├── GuildQueue.js      # Cola de reproducción por servidor
│   ├── spotify.js         # Integración con API de Spotify
│   └── commands/
│       ├── play.js        # Comando principal (YouTube + Spotify)
│       ├── skip.js
│       ├── pause.js
│       ├── resume.js
│       ├── stop.js
│       ├── queue.js
│       ├── nowplaying.js
│       ├── loop.js
│       ├── leave.js
│       └── help.js
├── config.json            # ⚠️ No subir a git
├── .gitignore
├── package.json
└── README.md
```

---

## ⚠️ Notas

- **Nunca** subas `config.json` a GitHub (ya está en `.gitignore`)
- Playlists de Spotify muy grandes pueden tardar en cargarse
- El bot necesita que estés en un canal de voz para funcionar
