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

// --- IDs DOS CARGOS E CANAIS ---
const CARGO_FAMILIA = "1470481510284132544"; //
const CARGO_SEM_CARGO = "1472350861719113893"; //
const CANAL_PENDENTES = "1475596507456475146";
const CANAL_APROVADOS = "1475596732292137021";

// 1. AUTO-ROLE: DAR "SEM CARGO" ASSIM QUE ENTRA
client.on('guildMemberAdd', async member => {
  try {
    await member.roles.add(CARGO_SEM_CARGO);
    console.log(`Cargo inicial dado a ${member.user.tag}`);
  } catch (e) {
    console.error("Erro no auto-role:", e.message);
  }
});

client.on('interactionCreate', async interaction => {
  
  // 2. COMANDO SETUP
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('abrir_ficha').setLabel('Fazer Candidatura').setStyle(ButtonStyle.Primary)
    );
    await interaction.reply({ content: "🏮 **Recrutamento YKZ**\nClica no botão para enviares a tua ficha:", components: [row] });
  }

  // 3. EXIBIR MODAL
  if (interaction.isButton() && interaction.customId === 'abrir_ficha') {
    const modal = new ModalBuilder().setCustomId('modal_ficha').setTitle('Ficha de Candidatura');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome Real').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox').setLabel('Roblox User').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('idade').setLabel('Idade').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('recrutador').setLabel('Quem te recrutou?').setStyle(TextInputStyle.Short).setRequired(true))
    );
    await interaction.showModal(modal);
  }

  // 4. RECEBER FICHA
  if (interaction.isModalSubmit() && interaction.customId === 'modal_ficha') {
    await interaction.reply({ content: "Ficha enviada! 🌸", ephemeral: true });
    
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

  // 5. BOTÃO APROVAR: TROCA DE CARGOS E NICK
  if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
    await interaction.deferUpdate();
    const alvoId = interaction.customId.split('_')[1];
    
    try {
      const alvo = await interaction.guild.members.fetch(alvoId);
      
      // Troca os cargos
      await alvo.roles.add(CARGO_FAMILIA);
      await alvo.roles.remove(CARGO_SEM_CARGO);
      
      // Ajusta o Nickname
      const desc = interaction.message.embeds[0].description;
      const nomeMatch = desc.match(/Nome Real:\s*(.*)/);
      const nomeFicha = nomeMatch ? nomeMatch[1].replace(/[*_~]/g, '').trim() : "Membro";

      await alvo.setNickname(`[𝒀𝑲𝒁𝒙𝑭𝑴𝑳] ${nomeFicha}`).catch(() => {});

      const canalAprovados = interaction.guild.channels.cache.get(CANAL_APROVADOS);
      if (canalAprovados) await canalAprovados.send({ content: `✅ ${alvo} foi aprovado!`, embeds: [interaction.message.embeds[0]] });
      
      await interaction.message.delete();
    } catch (e) { console.error(e); }
  }
});

// --- REGISTO DO COMANDO SETUP ---
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { 
      body: [new SlashCommandBuilder().setName('setup').setDescription('Cria o botão de ficha')] 
    });
  } catch (e) { console.error(e); }
})();

express().get("/", (req, res) => res.send("Sistema YKZ Ativo")).listen(process.env.PORT || 3000);
client.login(process.env.TOKEN);