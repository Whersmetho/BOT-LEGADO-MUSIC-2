FROM node:20-slim

RUN apt-get update && apt-get install -y python3 python3-pip curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp via pip para que yt-dlp -U funcione correctamente en runtime
RUN pip3 install --break-system-packages yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "src/index.js"]
