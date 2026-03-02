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
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';

import express from 'express';
import 'dotenv/config';

// ================= WEB SERVER =================
const app = express();
app.get("/", (req, res) => res.send("Bot May Online 🏮"));
app.listen(process.env.PORT || 3000);

// ================= DISCORD CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ========= 🔧 COLOCA AQUI OS IDS =========
const PENDENTES_ID = "1475596507456475146";
const APROVADOS_ID = "1475596732292137021";
const RECUSADOS_ID = "1475705535700664330";

const SEM_CARGO_ID = "1472350861719113893";
const FAMILIA_ID = "1470481510284132544";

// ================= DAR CARGO AUTOMÁTICO =================
client.on("guildMemberAdd", async (member) => {
  try {
    await member.roles.add(SEM_CARGO_ID);
  } catch (err) {
    console.log("Erro ao dar cargo inicial:", err);
  }
});

// ================= REGISTAR COMANDO =================
client.on('ready', async () => {
  console.log(`✅ Logado como ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    {
      body: [
        new SlashCommandBuilder()
          .setName('setupykz')
          .setDescription('Envia o painel de recrutamento')
      ]
    }
  );
});

// ================= INTERAÇÕES =================
client.on('interactionCreate', async interaction => {

  // ================= PAINEL =================
  if (interaction.isChatInputCommand() && interaction.commandName === 'setupykz') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('abrir_ficha')
        .setLabel('Fazer Candidatura')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      content: "🏮 **RECRUTAMENTO YAKUZA**\nClique no botão abaixo.",
      components: [row]
    });
  }

  // ================= ABRIR MODAL =================
  if (interaction.isButton() && interaction.customId === 'abrir_ficha') {

    const modal = new ModalBuilder()
      .setCustomId('modal_ykz')
      .setTitle('Ficha de Recrutamento');

    const nome = new TextInputBuilder()
      .setCustomId('nome')
      .setLabel('Nome')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const idade = new TextInputBuilder()
      .setCustomId('idade')
      .setLabel('Idade')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const roblox = new TextInputBuilder()
      .setCustomId('roblox')
      .setLabel('User do Roblox')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const recrutador = new TextInputBuilder()
      .setCustomId('recrutador')
      .setLabel('Quem te recrutou?')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nome),
      new ActionRowBuilder().addComponents(idade),
      new ActionRowBuilder().addComponents(roblox),
      new ActionRowBuilder().addComponents(recrutador)
    );

    await interaction.showModal(modal);
  }

  // ================= ENVIAR CANDIDATURA =================
  if (interaction.isModalSubmit() && interaction.customId === 'modal_ykz') {

    const nome = interaction.fields.getTextInputValue('nome');
    const idade = interaction.fields.getTextInputValue('idade');
    const roblox = interaction.fields.getTextInputValue('roblox');
    const recrutador = interaction.fields.getTextInputValue('recrutador');

    const embed = new EmbedBuilder()
      .setTitle("📋 Nova Candidatura")
      .setColor("Red")
      .addFields(
        { name: "👤 Nome Real", value: nome },
        { name: "🎂 Idade", value: idade },
        { name: "🎮 Roblox User", value: roblox },
        { name: "🤝 Recrutador", value: recrutador }
      )
      .setFooter({ text: `ID:${interaction.user.id}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`aprovar_${interaction.user.id}`)
        .setLabel("Aprovar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`recusar_${interaction.user.id}`)
        .setLabel("Recusar")
        .setStyle(ButtonStyle.Danger)
    );

    const canal = await client.channels.fetch(PENDENTES_ID);
    await canal.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: "✅ Candidatura enviada com sucesso!",
      ephemeral: true
    });
  }

  // ================= APROVAR =================
  if (interaction.isButton() && interaction.customId.startsWith("aprovar_")) {

    const userId = interaction.customId.split("_")[1];
    const member = await interaction.guild.members.fetch(userId);
    const embedOriginal = interaction.message.embeds[0];

    const nome = embedOriginal.fields[0].value;
    const idade = embedOriginal.fields[1].value;
    const roblox = embedOriginal.fields[2].value;
    const recrutador = embedOriginal.fields[3].value;

    await member.roles.remove(SEM_CARGO_ID);
    await member.roles.add(FAMILIA_ID);
    await member.setNickname(`[𝒀𝑲𝒁𝒙𝑭𝑴𝑳] ${member.user.username}`);

    const novoEmbed = EmbedBuilder.from(embedOriginal)
      .setColor("Green")
      .setTitle("✅ Candidatura Aprovada")
      .addFields({ name: "🛡️ Aprovado por", value: `${interaction.user}` });

    await interaction.update({
      embeds: [novoEmbed],
      components: []
    });

    const aprovados = await client.channels.fetch(APROVADOS_ID);

    await aprovados.send(
`━━━━━━━━━━━━━━━━━━
🏮 **MEMBRO ACEITE NO CLÃ**
━━━━━━━━━━━━━━━━━━

👤 **Membro:** ${member}
📝 **Nome Real:** ${nome}
🎮 **Roblox:** ${roblox}
🎂 **Idade:** ${idade}
🤝 **Recrutador:** ${recrutador}

🛡️ **Aprovado por:** ${interaction.user}

✨ Honra e Lealdade – Sistema May`
    );
  }

  // ================= RECUSAR =================
  if (interaction.isButton() && interaction.customId.startsWith("recusar_")) {

    const userId = interaction.customId.split("_")[1];
    const embedOriginal = interaction.message.embeds[0];

    const novoEmbed = EmbedBuilder.from(embedOriginal)
      .setColor("DarkRed")
      .setTitle("❌ Candidatura Recusada")
      .addFields({ name: "🛡️ Recusado por", value: `${interaction.user}` });

    await interaction.update({
      embeds: [novoEmbed],
      components: []
    });

    const recusados = await client.channels.fetch(RECUSADOS_ID);

    await recusados.send(
`━━━━━━━━━━━━━━━━━━
❌ **CANDIDATURA RECUSADA**
━━━━━━━━━━━━━━━━━━

👤 **Membro:** <@${userId}>

🛡️ **Recusado por:** ${interaction.user}

📜 Sistema May`
    );
  }

});

client.login(process.env.TOKEN);