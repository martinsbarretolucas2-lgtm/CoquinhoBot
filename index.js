const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Configuração da IA (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const modelIA = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Servidor para o Render não derrubar o Bot
const app = express();
app.get('/', (req, res) => res.send("🥥 CoquinhoBot está Online!"));
app.listen(process.env.PORT || 3000);

// Conexão com o Banco de Dados (MongoDB)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Banco de Dados Conectado!'))
    .catch(err => console.error('❌ Erro no MongoDB:', err));

// Modelo de Usuário para Economia
const User = mongoose.model('User', new mongoose.Schema({
    userId: String,
    coins: { type: Number, default: 0 }
}));

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Comando !daily
    if (message.content === '!daily') {
        let user = await User.findOne({ userId: message.author.id }) || new User({ userId: message.author.id });
        user.coins += 100;
        await user.save();
        return message.reply(`💰 Você ganhou 100 moedas diárias! Saldo atual: ${user.coins}`);
    }

    // Chat com a IA (Mencione o bot para falar com ele)
    if (message.mentions.has(client.user)) {
        const prompt = message.content.replace(/<@!\d+>|<@\d+>/g, '').trim();
        if (!prompt) return message.reply("🥥 Me chamou? Pode falar!");
        
        try {
            const result = await modelIA.generateContent(prompt);
            const responseText = result.response.text();
            message.reply(responseText.slice(0, 2000));
        } catch (error) {
            message.reply("Minha mente divina deu um curto-circuito, tente de novo!");
        }
    }
});

client.login(process.env.TOKEN);
