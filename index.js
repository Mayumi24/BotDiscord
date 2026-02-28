import fs from 'fs';
import { 
  Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
  ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, 
  SlashCommandBuilder, EmbedBuilder 
} from 'discord.js';
import express from 'express';
import 'dotenv/config';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

// --- IDs FIXOS (CONFORME AS TUAS IMAGENS) ---
const CARGO_FAMILIA = "1470481510284132544";
const CARGO_SEM_CARGO = "1472350861719113893";
const CARGO_PRISIONEIRO = "1476573034855796927";
const CANAL_PENDENTES = "1475596507456475146";
const CANAL_APROVADOS = "1475596732292137021";

client.on('interactionCreate', async interaction => {
  // 1. COMANDO SETUP
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('abrir_form').setLabel('Fazer Candidatura').setStyle(ButtonStyle.Primary)
    );
    await interaction.reply({ content: "Clica no botão para enviares a tua candidatura:", components: [row] });
  }

  // 2. ABRIR MODAL
  if (interaction.isButton() && interaction.customId === 'abrir_form') {
    const modal = new ModalBuilder().setCustomId('form_comunidade').setTitle('Ficha de Candidatura');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome Real').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox').setLabel('Roblox User').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('idade').setLabel('Idade').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('recrutador').setLabel('Quem te recrutou?').setStyle(TextInputStyle.Short).setRequired(true))
    );
    await interaction.showModal(modal);
  }

  // 3. RECEBER MODAL
  if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {
    try {
      await interaction.reply({ content: "A enviar ficha...", ephemeral: true });
      
      const embedStaff = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('🏮 Nova Ficha de Recrutamento')
        .setDescription(`👤 **Membro:** ${interaction.user}\n📝 **Nome Real:** ${interaction.fields.getTextInputValue('nome')}\n🎮 **Roblox:** ${interaction.fields.getTextInputValue('roblox')}\n🤝 **Recrutador:** ${interaction.fields.getTextInputValue('recrutador')}`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
      );

      const canal = interaction.guild.channels.cache.get(CANAL_PENDENTES);
      if (canal) await canal.send({ embeds: [embedStaff], components: [row] });
      await interaction.editReply({ content: "Ficha enviada com sucesso! 🌸" });
    } catch (e) { console.error(e); }
  }

  // 4. APROVAR
  if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
    try {
      await interaction.deferUpdate();
      const alvoId = interaction.customId.split('_')[1];
      const alvo = await interaction.guild.members.fetch(alvoId);
      
      await alvo.roles.add(CARGO_FAMILIA);
      await alvo.roles.remove(CARGO_SEM_CARGO);
      
      const nomeFicha = interaction.message.embeds[0].description.match(/Nome Real:\s*(.*)/)[1];
      await alvo.setNickname(`[𝒀𝑲𝒁𝒙𝑭𝑴𝑳] ${nomeFicha.replace(/[*_~]/g, '')}`).catch(() => {});

      const canalLog = interaction.guild.channels.cache.get(CANAL_APROVADOS);
      if (canalLog) await canalLog.send({ content: `Parabéns ${alvo}!`, embeds: [interaction.message.embeds[0]] });
      
      await interaction.message.delete();
    } catch (e) { console.error(e); }
  }

  // 5. JULGAR / SOLTAR
  if (interaction.isChatInputCommand()) {
    await interaction.deferReply();
    const alvo = interaction.options.getMember('usuario');
    
    if (interaction.commandName === 'julgar') {
      try {
        await alvo.roles.add(CARGO_PRISIONEIRO);
        await interaction.editReply(`⚖️ ${alvo} foi preso.`);
      } catch (e) { await interaction.editReply("Erro: Verifica a minha posição nos cargos."); }
    }
    
    if (interaction.commandName === 'soltar') {
      try {
        await alvo.roles.remove(CARGO_PRISIONEIRO);
        await alvo.timeout(null);
        await interaction.editReply(`✅ ${alvo} foi solto.`);
      } catch (e) { await interaction.editReply("Erro ao soltar."); }
    }
  }
});

// --- REGISTO ---
const commands = [
  new SlashCommandBuilder().setName('setup').setDescription('Botão candidatura'),
  new SlashCommandBuilder().setName('soltar').setDescription('Liberta alguém').addUserOption(o => o.setName('usuario').setRequired(true).setDescription('Membro')),
  new SlashCommandBuilder().setName('julgar').setDescription('Tribunal')
    .addUserOption(o => o.setName('usuario').setRequired(true).setDescription('Réu'))
    .addStringOption(o => o.setName('veredito').setRequired(true).setDescription('Veredito').addChoices({name:'Culpado',value:'culpado'},{name:'Inocente',value:'inocente'}))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log("Comandos Registados!");
  } catch (e) { console.error(e); }
})();

express().get("/", (req, res) => res.send("Online")).listen(process.env.PORT || 3000);
client.login(process.env.TOKEN);