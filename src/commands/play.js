const {
  joinVoiceChannel
} = require('@discordjs/voice');

module.exports = {
  name: 'play',
  aliases: ['p'],

  async execute(message, args, client) {

    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      return message.reply('❌ Debes entrar a un canal de voz.');
    }

    // =========================
    // ANTI DOBLE BOT
    // SOLO BOT 2
    // =========================

    // Esperar para dar prioridad al BOT 1
    await new Promise(r => setTimeout(r, 1500));

    // Revisar si ya hay otro bot conectado
    const existingBots = voiceChannel.members.filter(
      m =>
        m.user.bot &&
        m.id !== client.user.id
    );

    // Si ya hay otro bot conectado cancelar
    if (existingBots.size > 0) {
      return;
    }

    // =========================
    // RESTO DE TU PLAY NORMAL
    // =========================

    const queueKey = `${message.guild.id}-${client.user.id}`;

    let queue = client.queues.get(queueKey);
   
    // ANTI DOBLE BOT
await new Promise(r => setTimeout(r, 1500));

const existingBots = voiceChannel.members.filter(
  m =>
    m.user.bot &&
    m.id !== client.user.id
);

if (existingBots.size > 0) {
  return;
}

    // Crear queue si no existe
    if (!queue) {

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      queue = {
        voiceChannel,
        connection,
        songs: [],
        playing: true,
        ownerId: message.author.id,
      };

      client.queues.set(queueKey, queue);
    }

    // Tu lógica original aquí
    // agregar canciones
    // reproducir
    // etc.
  },
};
