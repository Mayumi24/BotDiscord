import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder } from 'discord.js';
import express from 'express';
import 'dotenv/config';

const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// Canal de Logs/Pendentes para teste
const CANAL_PENDENTES = "1475596507456475146";

// Servidor para o Render não desligar o bot
app.get("/", (req, res) => res.send("Bot YKZ está Vivo! 🏮"));
app.listen(process.env.PORT || 3000, () => console.log("Servidor Web Ativo"));

client.on('ready', () => {
  console.log(`✅ Logada como ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('abrir_ficha_ok').setLabel('Fazer Candidatura').setStyle(ButtonStyle.Primary)
    );
    await interaction.reply({ content: "🏮 Clique abaixo para iniciar:", components: [row] });
  }

  if (interaction.isButton() && interaction.customId === 'abrir_ficha_ok') {
    const modal = new ModalBuilder().setCustomId('modal_ok').setTitle('Recrutamento YKZ');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('Nome Real').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('r').setLabel('Roblox').setStyle(TextInputStyle.Short).setRequired(true))
    );
    await interaction.showModal(modal);
  }
});

// Registo de comandos
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { 
      body: [new SlashCommandBuilder().setName('setup').setDescription('Criar botão')] 
    });
  } catch (e) { console.error(e); }
})();

client.login(process.env.TOKEN);