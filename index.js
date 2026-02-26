import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import express from 'express';
import 'dotenv/config';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    const isAprovar = interaction.customId.startsWith('aprovar_');
    const isRecusar = interaction.customId.startsWith('recusar_');

    if (isAprovar || isRecusar) {
      const canalDestinoId = isAprovar ? "1475596732292137021" : "1475705535700664330";
      const canalDestino = interaction.guild.channels.cache.get(canalDestinoId);
      if (!canalDestino) return interaction.reply({ content: "❌ Canal não encontrado!", ephemeral: true });

      const embedOriginal = interaction.message.embeds[0];
      const novoEmbed = EmbedBuilder.from(embedOriginal)
        .setColor(isAprovar ? 0x2f3136 : 0x000000) // Cores discretas Yakuza
        .setTitle(isAprovar ? "🏮 Candidato Aceite no Clã" : "⚔️ Candidato Recusado")
        .addFields({ name: '🛡️ Oyabun/Staff:', value: `${interaction.user}`, inline: false });

      await canalDestino.send({ embeds: [novoEmbed] });
      await interaction.message.delete();
      return interaction.reply({ content: `Decisão registada.`, ephemeral: true });
    }

    if (interaction.customId === 'abrir_form') {
      const modal = new ModalBuilder().setCustomId('form_comunidade').setTitle('Recrutamento Yakuza');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome IC (Nome Real)').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox').setLabel('User Roblox').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('idade').setLabel('Idade').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('recrutador').setLabel('Quem te recrutou?').setStyle(TextInputStyle.Short))
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

    const embedStaff = new EmbedBuilder()
      .setColor(0x990000) // Vermelho Yakuza
      .setTitle('🏮 Nova Ficha de Recrutamento')
      .setThumbnail(interaction.guild.iconURL()) // FOTO DO SEU CLÃ (Ícone do Servidor)
      .setDescription(`Um novo membro deseja honrar o nosso clã.`)
      .addFields(
        { name: '👤 Candidato', value: `${interaction.user}`, inline: true },
        { name: '📝 Nome IC', value: nome, inline: true },
        { name: '🎮 Roblox', value: roblox, inline: true },
        { name: '🎂 Idade', value: idade, inline: true },
        { name: '🤝 Recrutador', value: recrutador, inline: false }
      )
      .setFooter({ text: 'Honra e Lealdade - Sistema May', iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    await staffCanal.send({ embeds: [embedStaff], components: [row] });
    await interaction.reply({ content: "Ficha enviada para os superiores!", ephemeral: true });
  }
});

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    const commands = [new SlashCommandBuilder().setName('setup').setDescription('Painel de candidatura')].map(c => c.toJSON());
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
  } catch (e) { console.error(e); }
})();

const app = express();
app.get("/", (req, res) => res.send("Bot Online"));
app.listen(process.env.PORT || 3000, '0.0.0.0');

client.once('ready', () => console.log('May está online com tema Yakuza!'));
client.login(process.env.TOKEN);