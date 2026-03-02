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

// ========= 🔧 IDS =========
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

    const roblox = new TextInputBuilder()
      .setCustomId('roblox')
      .setLabel('Nome no Roblox')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const idade = new TextInputBuilder()
      .setCustomId('idade')
      .setLabel('Idade')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const recrutador = new TextInputBuilder()
      .setCustomId('recrutador')
      .setLabel('Quem te recrutou?')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(roblox),
      new ActionRowBuilder().addComponents(idade),
      new ActionRowBuilder().addComponents(recrutador)
    );

    await interaction.showModal(modal);
  }

  // ================= ENVIAR CANDIDATURA =================
  if (interaction.isModalSubmit() && interaction.customId === 'modal_ykz') {

    const roblox = interaction.fields.getTextInputValue('roblox');
    const idade = interaction.fields.getTextInputValue('idade');
    const recrutador = interaction.fields.getTextInputValue('recrutador');

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setAuthor({
        name: "📋 Nova Candidatura",
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .addFields(
        { name: "🎮 Nome no Roblox", value: roblox, inline: true },
        { name: "🎂 Idade", value: idade, inline: true },
        { name: "🤝 Recrutador", value: recrutador, inline: true }
      )
      .setFooter({ text: `Candidato ID: ${interaction.user.id}` });

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

    // Buscar valores pelo nome do campo (não depende da ordem)
    const getField = (name) =>
      embedOriginal.fields.find(f => f.name === name)?.value || "Não informado";

    const roblox = getField("🎮 Nome no Roblox");
    const idade = getField("🎂 Idade");
    const recrutador = getField("🤝 Recrutador");

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

    const embedAprovado = new EmbedBuilder()
      .setColor("Green")
      .setAuthor({
        name: "🏮 Membro Aceite no Clã",
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .addFields(
        { name: "👤 Membro", value: `${member}` },
        { name: "🎮 Nome no Roblox", value: roblox, inline: true },
        { name: "🎂 Idade", value: idade, inline: true },
        { name: "🤝 Recrutador", value: recrutador, inline: true },
        { name: "🛡️ Aprovado por", value: `${interaction.user}` }
      )
      .setFooter({ text: "✨ Honra e Lealdade – Sistema May" });

    await aprovados.send({ embeds: [embedAprovado] });
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

    const embedRecusado = new EmbedBuilder()
      .setColor("DarkRed")
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .addFields(
        { name: "👤 Membro", value: `<@${userId}>` },
        { name: "🛡️ Recusado por", value: `${interaction.user}` }
      )
      .setFooter({ text: "📜 Sistema May" });

    await recusados.send({ embeds: [embedRecusado] });
  }

});

client.login(process.env.TOKEN);