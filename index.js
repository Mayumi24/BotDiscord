import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder } from 'discord.js';
import express from 'express';
import 'dotenv/config';

// 1. Servidor para manter o bot online no Render
const app = express();
app.get("/", (req, res) => res.send("Bot de Verificação e Logs Ativo! 🏮"));
app.listen(process.env.PORT || 3000, () => console.log("--- [WEB] Servidor Ativo ---"));

// 2. Configuração do Bot com as permissões necessárias
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildModeration, // Para detectar banimentos
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ] 
});

// 3. Registro do comando /verificar
client.on('ready', async () => {
  console.log(`✅ [DISCORD] Logado como: ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
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

// 4. Lógica do Botão de Verificação
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'verificar') {
    
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

// 5. REGISTRO AUTOMÁTICO DE BANIMENTOS
client.on('guildBanAdd', async (ban) => {
  try {
    const canalLogsId = process.env.CANAL_LOGS_ID;
    const canalLogs = ban.guild.channels.cache.get(canalLogsId);

    if (canalLogs) {
      await canalLogs.send(`🔨 **REGISTRO DE BANIMENTO**\n\n` +
                           `**Usuário:** ${ban.user.tag} (${ban.user.id})\n` +
                           `**Motivo:** ${ban.reason || 'Não especificado'}`);
      console.log(`Log de banimento enviado para o usuário: ${ban.user.tag}`);
    } else {
      console.log("⚠️ Canal de logs não encontrado. Verifique o ID no Render.");
    }
  } catch (err) {
    console.log("Erro ao registrar banimento:", err.message);
  }
});

client.login(process.env.TOKEN).catch(err => console.log("❌ Erro Login:", err.message));