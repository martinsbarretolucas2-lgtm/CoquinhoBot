const { Client, GatewayIntentBits } = require('discord.js');
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

// Correção do Plugin aqui:
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

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Banco de Dados Conectado!'))
    .catch(err => console.error('Erro Mongo:', err));

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!p')) {
        const args = message.content.split(' ').slice(1).join(' ');
        const vc = message.member.voice.channel;
        if (!vc) return message.reply("Entre num canal de voz!");
        distube.play(vc, args, { message, textChannel: message.channel, member: message.member });
    }
    
    if (message.mentions.has(client.user)) {
        const prompt = message.content.replace(/<@!\d+>|<@\d+>/g, '').trim();
        const result = await modelIA.generateContent(prompt || "Oi");
        message.reply(result.response.text().slice(0, 2000));
    }
});

client.login(process.env.TOKEN);
