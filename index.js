import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder } from 'discord.js';
import express from 'express';
import 'dotenv/config';

// 1. SERVIDOR WEB (Para o Render não desligar o bot)
const app = express();
app.get("/", (req, res) => res.send("Sistema YKZ Ativo! 🏮"));
app.listen(process.env.PORT || 3000, () => console.log("--- [WEB] Servidor Ativo na porta 3000 ---"));

// 2. CONFIGURAÇÃO DO BOT (Com os Intents que ativaste)
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

client.on('ready', () => {
  console.log(`✅ [DISCORD] SUCESSO! Logado como: ${client.user.tag}`);
});

// 3. TRATAMENTO DE INTERAÇÕES (Com Defer para evitar erros das tuas imagens)
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('abrir_v11').setLabel('Fazer Candidatura').setStyle(ButtonStyle.Primary)
    );
    await interaction.reply({ content: "🏮 **YKZ Recrutamento**\nClica abaixo para iniciar:", components: [row] });
  }

  if (interaction.isButton() && interaction.customId === 'abrir_v11') {
    const modal = new ModalBuilder().setCustomId('mod_v11').setTitle('Ficha YKZ');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('Nome').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('r').setLabel('Roblox').setStyle(TextInputStyle.Short).setRequired(true))
    );
    await interaction.showModal(modal);
  }
});

// 4. REGISTO DE COMANDOS E LOGIN
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { 
      body: [new SlashCommandBuilder().setName('setup').setDescription('Iniciar Botão')] 
    });
    console.log("--- [REST] Comandos sincronizados com o servidor ---");
  } catch (e) { console.error("--- [REST] Erro ao sincronizar:", e.message); }
})();

// Tenta o login e avisa se o Token estiver errado
client.login(process.env.TOKEN).catch(err => {
  console.error("❌ [LOGIN ERROR] O bot não ligou! Motivo:", err.message);
});