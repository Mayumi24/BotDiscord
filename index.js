import fs from 'fs';
import { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  REST, 
  Routes, 
  SlashCommandBuilder 
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

// --- LÓGICA DE INTERAÇÕES ---
client.on('interactionCreate', async interaction => {
  
  // 1. Quando alguém clica nos botões Aprovar ou Recusar
  if (interaction.isButton()) {
    const isAprovar = interaction.customId.startsWith('aprovar_');
    const isRecusar = interaction.customId.startsWith('recusar_');

    if (isAprovar || isRecusar) {
      const canalDestinoId = isAprovar ? "1475596732292137021" : "1475705535700664330";
      const canalDestino = interaction.guild.channels.cache.get(canalDestinoId);
      
      if (!canalDestino) return interaction.reply({ content: "❌ Canal não encontrado!", ephemeral: true });

      const candidaturaConteudo = interaction.message.content;
      const statusTexto = isAprovar ? "APROVADA ✅" : "RECUSADA ❌";

      // Move o balão para o canal de aprovados/recusados com o nome do Staff
      await canalDestino.send({
        content: `**CANDIDATURA ${statusTexto}**\n🛡️ **Staff:** ${interaction.user}\n━━━━━━━━━━━━━━━━━━\n${candidaturaConteudo}`
      });

      await interaction.message.delete();
      return interaction.reply({ content: `Candidatura movida com sucesso!`, ephemeral: true });
    }

    // Botão para abrir o formulário
    if (interaction.customId === 'abrir_form') {
      const modal = new ModalBuilder().setCustomId('form_comunidade').setTitle('Candidatura Comunidade');
      
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox').setLabel('User do Roblox').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('idade').setLabel('Idade').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('recrutador').setLabel('Quem te recrutou?').setStyle(TextInputStyle.Short))
      );
      await interaction.showModal(modal);
    }
  }

  // 2. Quando o membro envia o formulário (Cria o "Balão" para a Staff)
  if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {
    const nome = interaction.fields.getTextInputValue('nome');
    const roblox = interaction.fields.getTextInputValue('roblox');
    const idade = interaction.fields.getTextInputValue('idade');
    const recrutador = interaction.fields.getTextInputValue('recrutador');

    const staffCanal = interaction.guild.channels.cache.get("1475596507456475146");
    if (!staffCanal) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    // Formatação do balão de respostas para a staff
    const mensagem = `📋 **Nova Candidatura**\n👤 **Utilizador:** ${interaction.user}\n📝 **Nome:** ${nome}\n🎮 **User do Roblox:** ${roblox}\n🎂 **Idade:** ${idade}\n