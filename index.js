import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import express from 'express';
import 'dotenv/config';

// --- CONFIGURAÇÃO DO SERVIDOR WEB (RENDER) ---
const app = express();
app.get("/", (req, res) => res.send("Cadeia Municipal da May e Sistema de Verificação Ativos! 🚔"));
app.listen(process.env.PORT || 3000, () => console.log("--- [WEB] Servidor Ativo ---"));

// --- CONFIGURAÇÃO DO BOT ---
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildModeration, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ] 
});

// --- REGISTRO DE COMANDOS SLASH ---
client.on('ready', async () => {
  console.log(`✅ [DISCORD] Logado como: ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [
          // Comando /verificar
          new SlashCommandBuilder()
            .setName('verificar')
            .setDescription('Envia o painel de verificação'),
          
          // Comando /prender
          new SlashCommandBuilder()
            .setName('prender')
            .setDescription('Envia um infrator para a prisão (timeout)')
            .addUserOption(opt => opt.setName('infrator').setDescription('Quem vai ver o sol nascer quadrado?').setRequired(true))
            .addIntegerOption(opt => opt.setName('tempo').setDescription('Tempo de pena (em minutos)').setRequired(true))
            .addStringOption(opt => opt.setName('crime').setDescription('Qual foi o crime cometido?'))
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        ] 
      }
    );
    console.log("--- [REST] Comandos de Verificação e Prisão Registrados! ---");
  } catch (error) {
    console.log("⚠️ Erro no REST:", error.message);
  }
});

// --- INTERAÇÕES (COMANDOS) ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // Lógica da Verificação
  if (interaction.commandName === 'verificar') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Verifique-se')
        .setURL(process.env.LINK_VERIFICACAO || 'https://discord.com')
        .setStyle(ButtonStyle.Link)
    );

    const mensagem = "🏮 **SISTEMA DE VERIFICAÇÃO**\n\n" +
                     "• Para se verificar no servidor e liberar os demais canais, basta clicar no botão abaixo e autorizar nosso bot.\n\n" +
                     "• Após a autorização, você terá acesso completo aos **canais do servidor**.";

    await interaction.reply({ content: mensagem, components: [row] });
  }

  // Lógica da Prisão
  if (interaction.commandName === 'prender') {
    const usuario = interaction.options.getMember('infrator');
    const tempo = interaction.options.getInteger('tempo');
    const crime = interaction.options.getString('crime') || 'Vadiagem e mau comportamento';

    if (!usuario) return interaction.reply({ content: "❌ O meliante fugiu! (Usuário não encontrado)", ephemeral: true });
    
    try {
      // Aplica o Timeout (Castigo)
      await usuario.timeout(tempo * 60 * 1000, crime);
      
      const mensagemPublica = `⚖️ **SENTENÇA PROFERIDA**\n\n` +
                             `**Prisioneiro:** <@${usuario.id}>\n` +
                             `**Pena:** ${tempo} minutos na cela\n` +
                             `**Crime:** ${crime}\n\n` +
                             `🚓 *O réu foi levado para a prisão sem direito a fiança!*`;

      await interaction.reply({ content: mensagemPublica });

      // Envia anúncio no canal de PRISÃO
      const canalPrisaoId = process.env.CANAL_PRISAO_ID;
      const canalPrisao = interaction.guild.channels.cache.get(canalPrisaoId);
      if (canalPrisao) {
        await canalPrisao.send(`🚨 **Mural de Detentos:** <@${usuario.id}> foi trancafiado por **${tempo} minutos**.\n**Motivo:** ${crime}`);
      }

      // Registro nos Logs Privados
      const canalLogs = interaction.guild.channels.cache.get(process.env.CANAL_LOGS_ID);
      if (canalLogs) {
        canalLogs.send(`⛓️ **CADERNO DE OCORRÊNCIAS**\n**Infrator:** ${usuario.user.tag}\n**Tempo:** ${tempo} min\n**Crime:** ${crime}\n**Delegado:** ${interaction.user.tag}`);
      }

    } catch (err) {
      await interaction.reply({ content: "❌ O meliante é mais forte que a lei! (Verifique se meu cargo está acima do dele)", ephemeral: true });
    }
  }
});

// --- REGISTRO AUTOMÁTICO DE BANIMENTOS (SENTENÇA FINAL) ---
client.on('guildBanAdd', async (ban) => {
  const canalLogs = ban.guild.channels.cache.get(process.env.CANAL_LOGS_ID);
  if (canalLogs) {
    canalLogs.send(`💀 **SENTENÇA FINAL: BANIMENTO**\n**Exilado:** ${ban.user.tag} (${ban.user.id})\n**Motivo:** ${ban.reason || 'Crimes graves contra o servidor'}`);
  }
});

client.login(process.env.TOKEN);