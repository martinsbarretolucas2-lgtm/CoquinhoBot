const { Client, GatewayIntentBits, EmbedBuilder, Collection } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { DisTube } = require('distube');
const { YouTubeDLPlugin } = require('@distube/yt-dlp');
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const distube = new DisTube(client, {
    emitNewSongOnly: true,
    leaveOnFinish: false,
    plugins: [new YouTubeDLPlugin()]
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const modelIA = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const app = express();
app.get('/', (req, res) => res.send("CoquinhoBot Online!"));
app.listen(process.env.PORT || 3000);

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI).then(() => console.log('✅ Banco de Dados Conectado!'));

const User = mongoose.model('User', new mongoose.Schema({
    userId: String,
    coins: { type: Number, default: 0 },
    inventory: { type: Array, default: [] }
}));

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.mentions.has(client.user)) {
        const prompt = message.content.replace(/<@!\d+>|<@\d+>/g, '').trim();
        if (!prompt) return message.reply("🥥 Opa! Como posso ajudar?");
        try {
            const result = await modelIA.generateContent(prompt);
            return message.reply(result.response.text().slice(0, 2000));
        } catch (e) { return message.reply("Minha mente divina cansou, tente de novo!"); }
    }

    if (!message.content.startsWith('!')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play' || command === 'p') {
        const vc = message.member.voice.channel;
        if (!vc) return message.reply("Entre num canal de voz!");
        distube.play(vc, args.join(" "), { message, textChannel: message.channel, member: message.member });
    }

    if (command === 'daily') {
        let user = await User.findOne({ userId: message.author.id }) || new User({ userId: message.author.id });
        user.coins += 100;
        await user.save();
        message.reply(`💰 +100 moedas! Saldo: ${user.coins}`);
    }
});

distube.on('playSong', (queue, song) => {
    queue.textChannel.send(`🎶 Tocando: **${song.name}**`);
});

client.login(process.env.TOKEN);
