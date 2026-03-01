import { 
  Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
  ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, 
  SlashCommandBuilder, EmbedBuilder 
} from 'discord.js';
import express from 'express';
import 'dotenv/config';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers 
  ]
});

// --- CONFIGURAÇÃO DE IDs (YKZ) ---
const CARGO_FAMILIA = "1470481510284132544"; 
const CARGO_SEM_CARGO = "1472350861719113893"; 
const CANAL_PENDENTES = "1475596507456475146";
const CANAL_APROVADOS = "1475596732292137021";

// 1. AUTO-ROLE: DÁ O CARGO MAL A PESSOA ENTRA
client.on('guildMemberAdd', async member => {
  try {
    await member.roles.add(CARGO_SEM_CARGO);
  } catch (e) { console.error("Erro no auto-role:", e.message); }
});

client.on('interactionCreate', async interaction => {
  
  // 2. COMANDO /SETUP (PARA CRIAR O BOTÃO)
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('abrir_ficha_v5').setLabel('Fazer Candidatura').setStyle(ButtonStyle.Primary)
    );
    await interaction.reply({ content: "🏮 **Recrutamento YKZ**\nClica no botão para enviares a tua ficha:", components: [row] });
  }

  // 3. ABRIR O FORMULÁRIO (MODAL)
  if (interaction.isButton() && interaction.customId === 'abrir_ficha_v5') {
    const modal = new ModalBuilder().setCustomId('modal_v5').setTitle('Ficha de Candidatura');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome Real').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox').setLabel('Roblox User').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('idade').setLabel('Idade').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('recrutador').setLabel('Quem te recrutou?').setStyle(TextInputStyle.Short).setRequired(true))
    );
    await interaction.showModal(modal);
  }

  // 4. RECEBER A FICHA (ENVIA PARA O CANAL DE PENDENTES)
  if (interaction.isModalSubmit() && interaction.customId === 'modal_v5') {
    // Resposta rápida para o Discord não dar erro
    await interaction.reply({ content: "Ficha enviada com sucesso! 🌸", ephemeral: true });
    
    const staffCanal = interaction.guild.channels.cache.get(CANAL_PENDENTES);
    const nome = interaction.fields.getTextInputValue('nome');

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🏮 Nova Ficha de Recrutamento')
      .setDescription(`👤 **Membro:** ${interaction.user}\n📝 **Nome Real:** ${nome}\n🎮 **Roblox:** ${interaction.fields.getTextInputValue('roblox')}\n🤝 **Recrutador:** ${interaction.fields.getTextInputValue('recrutador')}`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    if (staffCanal) await staffCanal.send({ embeds: [embed], components: [row] });
  }

  // 5. BOTÃO APROVAR: TROCA DE CARGOS E MUDANÇA DE NOME
  if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
    await interaction.deferUpdate(); // Resolve o erro "Interação falhou"
    
    const alvoId = interaction.customId.split('_')[1];
    try {
      const alvo = await interaction.guild.members.fetch(alvoId);
      
      // Dá Familia e tira Sem Cargo ao mesmo tempo
      await alvo.roles.add(CARGO_FAMILIA);
      await alvo.roles.remove(CARGO_SEM_CARGO);
      
      // Extrai o nome real da embed para mudar o nick
      const desc = interaction.message.embeds[0].description;
      const nomeMatch = desc.match(/Nome Real:\s*(.*)/);
      const nomeFicha = nomeMatch ? nomeMatch[1].trim() : "Membro";

      // Aplica a tag YKZ
      await alvo.setNickname(`[𝒀𝑲𝒁𝒙𝑭𝑴𝑳] ${nomeFicha}`).catch(() => {});

      const canalAprovados = interaction.guild.channels.cache.get(CANAL_APROVADOS);
      if (canalAprovados) await canalAprovados.send({ content: `✅ ${alvo} foi aprovado!`, embeds: [interaction.message.embeds[0]] });
      
      await interaction.message.delete();
    } catch (e) { console.error("Erro na aprovação:", e.message); }
  }

  // 6. BOTÃO RECUSAR
  if (interaction.isButton() && interaction.customId.startsWith('recusar_')) {
    await interaction.deferUpdate();
    await interaction.message.delete();
  }
});

// REGISTO DO COMANDO SETUP
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { 
      body: [new SlashCommandBuilder().setName('setup').setDescription('Cria o botão de ficha')] 
    });
  } catch (e) { console.error(e); }
})();

express().get("/", (req, res) => res.send("Sistema YKZ Online")).listen(process.env.PORT || 3000);
client.login(process.env.TOKEN);