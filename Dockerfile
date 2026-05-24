FROM node:20-slim

# Instalar yt-dlp y sus dependencias
RUN apt-get update && apt-get install -y \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp (ffmpeg viene de ffmpeg-static en npm)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "src/index.js"]
