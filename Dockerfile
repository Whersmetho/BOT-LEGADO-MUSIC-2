FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 python3-pip curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp y yt-dlp-get-pot (plugin para PO Token)
RUN pip3 install --break-system-packages yt-dlp yt-dlp-get-pot

WORKDIR /app

COPY package*.json ./
RUN npm install

# Instalar bgutil-ytdlp-pot-provider (genera PO tokens automáticamente)
RUN npm install bgutil-ytdlp-pot-provider

COPY . .

CMD ["node", "src/index.js"]
