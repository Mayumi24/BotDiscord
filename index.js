import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder } from 'discord.js';
import express from 'express';
import 'dotenv/config';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const app = express();

// Isso mantém o Render ativo
app.get("/", (req, res) => res.send("Bot Online"));
app.listen(process.env.PORT || 3000);

client.on('ready', () => {
  console.log(`✅ ${client.user.tag} está ONLINE!`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('fichav7').setLabel('Fazer Candidatura').setStyle(ButtonStyle.Primary)
    );
    await interaction.reply({ content: "🏮 Clique abaixo:", components: [row] });
  }

  if (interaction.isButton() && interaction.customId === 'fichav7') {
    const modal = new ModalBuilder().setCustomId('modalv7').setTitle('Recrutamento');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('Nome').setStyle(TextInputStyle.Short).setRequired(true))
    );
    await interaction.showModal(modal);
  }
});

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { 
      body: [new SlashCommandBuilder().setName('setup').setDescription('Botão')] 
    });
  } catch (e) { console.error("Erro no Registro:", e); }
})();

client.login(process.env.TOKEN).catch(err => console.error("Erro no Login: Token Inválido!"));