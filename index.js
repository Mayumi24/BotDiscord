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
  TextInputStyle,
  REST,
  Routes,
  SlashCommandBuilder
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
});


client.on('interactionCreate', async interaction => {
  if (interaction.isButton() && interaction.customId === "aprovar") {

    const cargoId = "1470481510284132544";

    const userId = interaction.message.embeds[0].footer.text;

    const member = await interaction.guild.members.fetch(userId);

    await member.roles.add(cargoId);

    const nomeBase = member.user.username;

    if (!member.displayName.startsWith('[YKZxFML]')) {
        await member.setNickname(`[YKZxFML] ${nomeBase}`);
    }

    await interaction.reply({
        content: "✅ Usuário aprovado com sucesso!",
        ephemeral: true
    });
}
// 🔹 Comando /setup
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'setup') {

      const botao = new ButtonBuilder()
        .setCustomId('abrir_form')
        .setLabel('📩 Fazer Candidatura')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(botao);

      await interaction.reply({
        content: 'Clica no botão para enviares a tua candidatura:',
        components: [row]
      });

      return;
    }
  }
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
    const membro = await interaction.guild.members.fetch(userId);

    const cargoId = "1470481510284132544";

    await membro.roles.add(cargoId);

const nomeBase = membro.user.username;

if (!membro.displayName.startsWith('[𝒀𝑲𝒁𝒙𝑭𝑴𝑳]')) {
    await membro.setNickname(`[𝒀𝑲𝒁𝒙𝑭𝑴𝑳] ${nomeBase}`);
}
    
    const canalAprovados = interaction.guild.channels.cache.get("1475596732292137021");
    if (canalAprovados) canalAprovados.send(`✅ <@${userId}> foi aprovado!`);

    await interaction.message.delete();
    await interaction.reply({ content: "Utilizador aprovado!", ephemeral: true });
}

});
const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Enviar painel de candidatura')
].map(command => command.toJSON());
console.log("CLIENT_ID:", process.env.CLIENT_ID);
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
    Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
    ),
    { body: commands }
);
    console.log('Comando /setup registrado!');
  } catch (error) {
    console.error(error);
  }
})();
client.once('ready', async () => {
  console.log('Bot online!');
});
client.login(process.env.TOKEN);

client.on("reconnecting", () => {
  console.log("Reconectando...");
});

client.on("error", (err) => {
  console.error("Erro no client:", err);
});
const express = require('express');
const app = express();

app.get("/", (req, res) => {
  res.status(200).send("May está viva 🔥");
});
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.listen(process.env.PORT || 3000, () => {
  console.log('Web server running');
});
setInterval(() => {
  console.log("Still alive:", new Date().toISOString());
}, 240000);