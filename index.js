// index.js do Bot Discord completo com .env e batch + logs

const fs = require('fs');
const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Função para gravar logs
function logCandidatura(mensagem) {
  const logLine = `[${new Date().toLocaleString()}] ${mensagem}\n`;
  fs.appendFileSync('logs_candidaturas.txt', logLine);
}

client.once('ready', async () => {
  console.log('Bot online!');

  const guild = client.guilds.cache.first();
  if (!guild) return;

  const canal = guild.channels.cache.get("1475592431725445333");

  if (!canal) {
    console.log("Canal de Registros não encontrado");
    return;
  }

  const botao = new ButtonBuilder()
    .setCustomId('abrir_form')
    .setLabel('📩 Fazer Candidatura')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(botao);

  canal.send({
    content: 'Clica no botão para enviares a tua candidatura:',
    components: [row]
  });
});

client.on('interactionCreate', async interaction => {

  if (interaction.isButton() && interaction.customId === 'abrir_form') {

    const modal = new ModalBuilder()
      .setCustomId('form_comunidade')
      .setTitle('Candidatura Comunidade');

    const nome = new TextInputBuilder()
      .setCustomId('nome')
      .setLabel('Qual é o teu nome?')
      .setStyle(TextInputStyle.Short);

    const robloxUser = new TextInputBuilder()
      .setCustomId('roblox')
      .setLabel('User do Roblox')
      .setStyle(TextInputStyle.Short);

    const idade = new TextInputBuilder()
      .setCustomId('idade')
      .setLabel('Qual é a tua idade?')
      .setStyle(TextInputStyle.Short);

    const recrutador = new TextInputBuilder()
      .setCustomId('recrutador')
      .setLabel('Quem te recrutou?')
      .setStyle(TextInputStyle.Short);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nome),
      new ActionRowBuilder().addComponents(robloxUser),
      new ActionRowBuilder().addComponents(idade),
      new ActionRowBuilder().addComponents(recrutador)
    );

await interaction.showModal(modal);
return;}

if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {

    const nome = interaction.fields.getTextInputValue('nome');
    const roblox = interaction.fields.getTextInputValue('roblox');
    const idade = interaction.fields.getTextInputValue('idade');
    const recrutador = interaction.fields.getTextInputValue('recrutador');

   const staffCanal = interaction.guild.channels.cache.get("1475596507456475146");
    if (!staffCanal) return;

    const aprovar = new ButtonBuilder()
      .setCustomId(`aprovar_${interaction.user.id}`)
      .setLabel('Aprovar')
      .setStyle(ButtonStyle.Success);

    const recusar = new ButtonBuilder()
      .setCustomId(`recusar_${interaction.user.id}`)
      .setLabel('Recusar')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(aprovar, recusar);

    const mensagem = `📋 **Nova Candidatura**\n👤 Utilizador: <@${interaction.user.id}>\n📝 Nome: ${nome}\n🎮 User do Roblox: ${roblox}\n🎂 Idade: ${idade}\n🤝 Quem recrutou: ${recrutador}`;

    staffCanal.send({
      content: mensagem,
      components: [row]
    });

    logCandidatura(mensagem);

    await interaction.reply({ content: "Candidatura enviada com sucesso!", ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {

    const userId = interaction.customId.split('_')[1];

const canalAprovados = interaction.guild.channels.cache.get("1475596732292137021");   

if (canalAprovados) canalAprovados.send(`✅ <@${userId}> foi aprovado!`);

    await interaction.message.delete();
    await interaction.reply({ content: "Utilizador aprovado!", ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId.startsWith('recusar_')) {

    const userId = interaction.customId.split('_')[1];

    const canalRecusados = interaction.guild.channels.cache.get("1475705535700664330");
    if (canalRecusados) canalRecusados.send(`❌ <@${userId}> foi recusado.`);

    await interaction.message.delete();
    await interaction.reply({ content: "Utilizador recusado!", ephemeral: true });
  }

});

client.login(process.env.TOKEN);

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Web server running');
});