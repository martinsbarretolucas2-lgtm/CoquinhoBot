const { Client, GatewayIntentBits, EmbedBuilder, Collection } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { DisTube } = require('distube');
const { YouTubeDLPlugin } = require('@distube/yt-dlp');
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

// --- CONFIGURAÇÃO DO BOT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// --- SISTEMA DE MÚSICA (DisTube) ---
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    leaveOnFinish: false,
    plugins: [new YouTubeDLPlugin()]
});

// --- SISTEMA DE IA (Gemini) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const modelIA = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- CONEXÃO BANCO DE DADOS (MongoDB) ---
const MONGO_URI = "mongodb+srv://CoquinhoBot:Lucassedavi32%40@coquinhobot.8llg9wf.mongodb.net/?appName=CoquinhoBot";
mongoose.connect(MONGO_URI).then(() => console.log('✅ Banco de Dados Conectado!'));

const User = mongoose.model('User', new mongoose.Schema({
    userId: String,
    coins: { type: Number, default: 0 },
    inventory: { type: Array, default: [] }
}));

// --- SERVIDOR WEB (Site para o Render) ---
const app = express();
app.get('/', (req, res) => {
    res.send(`
        <body style="background: #23272a; color: white; font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #5865F2;">🥥 CoquinhoBot Online!</h1>
            <p>Economia, Música e IA ativos com sucesso.</p>
            <img src="https://discord.com/assets/847541504914fd33810e70a0ea73177e.ico" width="50">
        </body>
    `);
});
app.listen(process.env.PORT || 3000);

// --- EVENTOS AUTOMÁTICOS ---

// Boas-vindas e Auto-Role
client.on('guildMemberAdd', async (member) => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'boas-vindas');
    if (channel) channel.send(`👑 **${member.user.username}** entrou no Olimpo!`);
    const role = member.guild.roles.cache.find(r => r.name === 'Membro');
    if (role) member.roles.add(role);
});

// Logs de Mensagens Deletadas
client.on('messageDelete', message => {
    if (message.author.bot) return;
    const logChannel = message.guild.channels.cache.find(ch => ch.name === 'logs');
    if (logChannel) {
        const embed = new EmbedBuilder()
            .setTitle('🗑️ Log de Deleção')
            .setDescription(`**Autor:** ${message.author}\n**Conteúdo:** ${message.content}`)
            .setColor('#ff0000').setTimestamp();
        logChannel.send({ embeds: [embed] });
    }
});

// --- COMANDOS ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Resposta com IA (Mencione o Bot)
    if (message.mentions.has(client.user)) {
        const prompt = message.content.replace(/<@!\d+>|<@\d+>/g, '').trim();
        if (!prompt) return message.reply("🥥 Me chamou? Diga o que deseja!");
        const result = await modelIA.generateContent(prompt);
        return message.reply(result.response.text().slice(0, 2000));
    }

    if (!message.content.startsWith('!')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // COMANDOS DE MÚSICA
    if (command === 'play' || command === 'p') {
        const vc = message.member.voice.channel;
        if (!vc) return message.reply("🎤 Entre num canal de voz!");
        distube.play(vc, args.join(" "), { message, textChannel: message.channel, member: message.member });
    }
    if (command === 'stop') { distube.stop(message); message.reply("⏹️ Parou!"); }
    if (command === 'skip') { distube.skip(message); message.reply("⏭️ Pulou!"); }

    // COMANDOS DE ECONOMIA
    if (command === 'daily') {
        let user = await User.findOne({ userId: message.author.id }) || new User({ userId: message.author.id });
        user.coins += 100;
        await user.save();
        message.reply(`💰 +100 moedas! Total: ${user.coins}`);
    }

    // COMANDOS DE MODERAÇÃO
    if (command === 'ban') {
        if (!message.member.permissions.has('BanMembers')) return message.reply('❌ Sem permissão!');
        const target = message.mentions.members.first();
        if (target) { await target.ban(); message.reply("🔨 Banido!"); }
    }
});

// Mensagem ao tocar música
distube.on('playSong', (queue, song) => {
    queue.textChannel.send(`🎶 Tocando: **${song.name}**`);
});

client.login(process.env.TOKEN);
