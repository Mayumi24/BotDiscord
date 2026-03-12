import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder } from 'discord.js';
import express from 'express';
import 'dotenv/config';

// Servidor para manter o bot online no Render
const app = express();
app.get("/", (req, res) => res.send("Bot de Verificação Ativo! 🏮"));
app.listen(process.env.PORT || 3000, () => console.log("--- [WEB] Servidor Ativo ---"));

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

client.on('ready', async () => {
  console.log(`✅ [DISCORD] Logado como: ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    // Regista apenas o comando de verificação
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [
          new SlashCommandBuilder()
            .setName('verificar')
            .setDescription('Envia o painel de verificação')
        ] 
      }
    );
    console.log("--- [REST] Comando /verificar pronto! ---");
  } catch (error) {
    console.log("⚠️ Erro no REST:", error.message);
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'verificar') {
    
    // Botão de link para autorização OAuth2
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Verifique-se')
        .setURL(process.env.LINK_VERIFICACAO || 'https://discord.com')
        .setStyle(ButtonStyle.Link)
    );

   const mensagem = "🏮 **SISTEMA DE VERIFICAÇÃO**\n\n" +
                     "• Para se verificar no servidor e liberar os demais canais, basta clicar no botão abaixo e autorizar nosso bot.\n\n" +
                     "• Após a autorização, você terá acesso completo aos **canais do servidor**.";

    await interaction.reply({ 
      content: mensagem, 
      components: [row] 
    });
  }
});

client.login(process.env.TOKEN).catch(err => console.log("❌ Erro Login:", err.message));