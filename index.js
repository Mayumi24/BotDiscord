import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder } from 'discord.js';
import express from 'express';
import 'dotenv/config';

// 1. Configuração do Servidor Web para o Render
const app = express();
app.get("/", (req, res) => res.send("Bot May Online! 🏮"));
app.listen(process.env.PORT || 3000, () => console.log("--- [WEB] Servidor Ativo ---"));

// 2. Inicialização do Bot com os Intents corretos
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

client.on('ready', () => {
  console.log(`✅ [DISCORD] Logada com sucesso como: ${client.user.tag}`);
});

// 3. Gestão de Interações (Comando e Botão)
client.on('interactionCreate', async interaction => {
  // Comando Slash NOVO para evitar duplicados
  if (interaction.isChatInputCommand() && interaction.commandName === 'painelykz') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('abrir_ficha_ykz_v1')
        .setLabel('Fazer Candidatura')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ 
      content: "🏮 **RECRUTAMENTO YAKUZA**\nClique no botão abaixo para iniciar a sua ficha.", 
      components: [row] 
    });
  }

  // Quando clicam no botão da ficha
  if (interaction.isButton() && interaction.customId === 'abrir_ficha_ykz_v1') {
    const modal = new ModalBuilder()
      .setCustomId('modal_ykz_v1')
      .setTitle('Recrutamento YAKUZA');

    const nomeInput = new TextInputBuilder()
      .setCustomId('nome_real')
      .setLabel('Qual o seu nome e idade?')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const robloxInput = new TextInputBuilder()
      .setCustomId('nick_roblox')
      .setLabel('Qual o seu Nick do Roblox?')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nomeInput),
      new ActionRowBuilder().addComponents(robloxInput)
    );

    await interaction.showModal(modal);
  }
});

// 4. Registo de Comandos Globais
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log("--- [REST] A atualizar comandos... ---");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [
          new SlashCommandBuilder()
            .setName('painelykz')
            .setDescription('Envia o painel de recrutamento da Yakuza')
        ] 
      }
    );
    console.log("--- [REST] Comandos sincronizados! ---");
  } catch (error) {
    console.error("❌ Erro ao registar comandos:", error);
  }
})();

// 5. Login Final
client.login(process.env.TOKEN);