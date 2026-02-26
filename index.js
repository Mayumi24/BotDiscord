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

// --- LOGICA DE BOTÕES (APROVAR/RECUSAR) ---
client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    const isAprovar = interaction.customId.startsWith('aprovar_');
    const isRecusar = interaction.customId.startsWith('recusar_');

    if (isAprovar || isRecusar) {
      // IDs dos Canais (conforme seu script anterior)
      const canalDestinoId = isAprovar ? "1475596732292137021" : "1475705535700664330";
      const canalDestino = interaction.guild.channels.cache.get(canalDestinoId);
      
      if (!canalDestino) return interaction.reply({ content: "❌ Canal não encontrado!", ephemeral: true });

      const candidaturaConteudo = interaction.message.content;
      const status = isAprovar ? "✅ APROVADA" : "❌ RECUSADA";

      // Envia para o canal final identificando o Staff
      await canalDestino.send({
        content: `**CANDIDATURA ${status}**\n🛡️ **Staff:** ${interaction.user}\n━━━━━━━━━━━━━━━━━━\n${candidaturaConteudo}`
      });

      await interaction.message.delete();
      return interaction.reply({ content: `Candidatura movida!`, ephemeral: true });
    }

    if (interaction.customId === 'abrir_form') {
      const modal = new ModalBuilder().setCustomId('form_comunidade').setTitle('Candidatura');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox').setLabel('User Roblox').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('idade').setLabel('Idade').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('recrutador').setLabel('Recrutador').setStyle(TextInputStyle.Short))
      );
      await interaction.showModal(modal);
    }
  }

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

    const mensagem = `📋 **Nova Candidatura**\n👤 **Utilizador:** ${interaction.user}\n📝 **Nome:** ${nome}\n🎮 **User:** ${roblox}\n🎂 **Idade:** ${idade}\n🤝 **Recrutador:** ${recrutador}`;
    
    await staffCanal.send({ content: mensagem, components: [row] });
    await interaction.reply({ content: "Enviado!", ephemeral: true });
  }
});

// --- REGISTRO DO COMANDO /SETUP ---
const commands = [new SlashCommandBuilder().setName('setup').setDescription('Painel de candidatura')].map(c => c.toJSON());
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log('Comando /setup ok!');
  } catch (e) { console.error(e); }
})();

// --- SERVIDOR PARA O RENDER ---
const app = express();
app.get("/", (req, res) => res.send("Bot Vivo 🔥"));
app.listen(process.env.PORT || 3000, '0.0.0.0');

client.login(process.env.TOKEN);