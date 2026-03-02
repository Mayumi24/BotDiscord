import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder } from 'discord.js';
import express from 'express';
import 'dotenv/config';

// Servidor Web para manter o Render ativo
const app = express();
app.get("/", (req, res) => res.send("Bot May está Online! 🏮"));
app.listen(process.env.PORT || 3000, () => console.log("--- [WEB] Servidor Ativo ---"));

// Inicialização com Intents
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

client.on('ready', () => {
  console.log(`✅ [DISCORD] Logado como: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  // Comando Slash para o Painel
  if (interaction.isChatInputCommand() && interaction.commandName === 'painelykz') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('abrir_ficha_ykz')
        .setLabel('Fazer Candidatura')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ 
      content: "🏮 **RECRUTAMENTO YAKUZA**\nClique no botão abaixo para iniciar a sua ficha.", 
      components: [row] 
    });
  }

  // Lógica do Modal/Botão
  if (interaction.isButton() && interaction.customId === 'abrir_ficha_ykz') {
    const modal = new ModalBuilder()
      .setCustomId('modal_ykz')
      .setTitle('Ficha de Recrutamento');

    const nome = new TextInputBuilder()
      .setCustomId('nome')
      .setLabel('Nome e Idade')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(nome));
    await interaction.showModal(modal);
  }
});

// Registro dos Comandos
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [
          new SlashCommandBuilder()
            .setName('painelykz')
            .setDescription('Envia o painel de recrutamento')
        ] 
      }
    );
    console.log("--- [REST] Comando registrado! ---");
  } catch (e) { console.error(e); }
})();

client.login(process.env.TOKEN);