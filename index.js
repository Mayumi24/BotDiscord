import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder } from 'discord.js';
import express from 'express';
import 'dotenv/config';

// 1. Servidor Web para o Render
const app = express();
app.get("/", (req, res) => res.send("Bot May Online! 🏮"));
app.listen(process.env.PORT || 3000, () => console.log("--- [WEB] Servidor Ativo ---"));

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

// 2. Quando o bot liga, ele regista os comandos
client.on('ready', async () => {
  console.log(`✅ [DISCORD] Logado como: ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    console.log("--- [REST] Atualizando comandos... ---");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [
          new SlashCommandBuilder()
            .setName('setupykz')
            .setDescription('Envia o painel de recrutamento')
        ] 
      }
    );
    console.log("--- [REST] Comando /setupykz pronto! ---");
  } catch (error) {
    console.log("⚠️ Erro no REST (ID do Servidor ou Client ID podem estar errados):", error.message);
  }
});

// 3. Lógica do comando e botão
client.on('interactionCreate', async interaction => {
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

client.login(process.env.TOKEN).then(() => {
    console.log("🚀 CONEXÃO ESTABELECIDA COM SUCESSO!");
}).catch(err => {
    console.log("❌ ERRO FATAL NO LOGIN:");
    console.log(err);
});