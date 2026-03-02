import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder } from 'discord.js';
import express from 'express';
import 'dotenv/config';

// 1. Servidor Web para o Render não desligar o bot
const app = express();
app.get("/", (req, res) => res.send("Bot May Online! 🏮"));
app.listen(process.env.PORT || 3000, () => console.log("--- [WEB] Servidor Ativo ---"));

// 2. Inicialização com os Intents que ativaste no Portal
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

// 3. Lógica das Interações (Comando e Botão)
client.on('interactionCreate', async interaction => {
  // Comando Slash: AGORA O NOME É IGUAL EM TODO O LADO
  if (interaction.isChatInputCommand() && interaction.commandName === 'setupykz') {
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

  // Lógica do Modal quando clicam no botão
  if (interaction.isButton() && interaction.customId === 'abrir_ficha_ykz') {
    const modal = new ModalBuilder()
      .setCustomId('modal_ykz')
      .setTitle('Ficha de Recrutamento');

    const nomeInput = new TextInputBuilder()
      .setCustomId('nome')
      .setLabel('Nome e Idade')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(nomeInput));
    await interaction.showModal(modal);
  }
});

// 4. Registo Automático do Comando no teu Servidor
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log("--- [REST] A registar comando /setupykz ---");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [
          new SlashCommandBuilder()
            .setName('setupykz')
            .setDescription('Envia o painel de recrutamento da Yakuza')
        ] 
      }
    );
    console.log("--- [REST] Comando registrado com sucesso! ---");
  } catch (error) {
    console.error("❌ Erro no REST:", error);
  }
})();

// 5. Login usando a variável que configuraste no Render
client.login(process.env.TOKEN);