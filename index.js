import fs from 'fs';
import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import express from 'express';
import 'dotenv/config';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

// --- GESTÃO DE PRISÃO ---
const DB_FILE = 'prisao.json';
const lerDados = () => fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
const salvarDados = (d) => fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));

client.on('interactionCreate', async interaction => {
  
  // 1. COMANDO DE JULGAMENTO (USANDO ID DO PRISIONEIRO)
  if (interaction.isChatInputCommand() && interaction.commandName === 'julgar') {
    const alvo = interaction.options.getMember('usuario');
    const veredito = interaction.options.getString('veredito');
    const motivo = interaction.options.getString('motivo') || "Sem motivo especificado";
    const canalPrisaoId = "1476577042857201684";

    if (veredito === 'culpado') {
      const dados = lerDados();
      dados[alvo.id] = { user: alvo.user.tag, crimes: (dados[alvo.id]?.crimes || 0) + 1 };
      salvarDados(dados);

      const tempoMin = 5 + ((dados[alvo.id].crimes - 1) * 5);

      try {
        const cargoPrisaoId = "1476573034855796927"; // ID que forneceste
        await alvo.roles.add(cargoPrisaoId); 
        await alvo.timeout(tempoMin * 60 * 1000, motivo); 
      } catch (e) { console.log("Erro permissão Prisão: " + e.message); }

      const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('⚖️ **SENTENÇA PROFERIDA** ⚖️')
        .setDescription(`👤 **Membro:** ${alvo}\n📝 **Motivo:** ${motivo}\n⏳ **Pena:** ${tempoMin} min`)
        .setFooter({ text: 'Honra e Lealdade - Sistema May 🌸' });

      const canalPrisao = interaction.guild.channels.cache.get(canalPrisaoId);
      if (canalPrisao) await canalPrisao.send({ embeds: [embed] });
      await interaction.reply({ content: `✅ Sentença aplicada!`, ephemeral: true });
    } else {
      await interaction.reply({ content: `😂 ${alvo} foi considerado inocente!` });
    }
  }

  // 2. ABRIR FORMULÁRIO
  if (interaction.isButton() && interaction.customId === 'abrir_form') {
    const modal = new ModalBuilder().setCustomId('form_comunidade').setTitle('Ficha de Candidatura');
    const campos = [
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome Real').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox').setLabel('Roblox User').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('idade').setLabel('Idade').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('recrutador').setLabel('Quem te recrutou?').setStyle(TextInputStyle.Short).setRequired(true))
    ];
    modal.addComponents(...campos);
    await interaction.showModal(modal);
  }

  // 3. RECEBER FORMULÁRIO
  if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {
    await interaction.reply({ content: "Sua ficha foi enviada! 🌸", ephemeral: true });

    const staffCanal = interaction.guild.channels.cache.get("1475596507456475146");
    const embedStaff = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🏮 Nova Ficha de Recrutamento')
      .setDescription(
        `👤 **Membro:** ${interaction.user}\n` +
        `📝 **Nome Real:** ${interaction.fields.getTextInputValue('nome')}\n` +
        `🎮 **Roblox User:** ${interaction.fields.getTextInputValue('roblox')}\n` +
        `🎂 **Idade:** ${interaction.fields.getTextInputValue('idade')}\n` +
        `🤝 **Recrutador:** ${interaction.fields.getTextInputValue('recrutador')}`
      )
      .setFooter({ text: 'Honra e Lealdade - Sistema May 🌸' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    if (staffCanal) await staffCanal.send({ embeds: [embedStaff], components: [row] });
  }

  // 4. APROVAR / RECUSAR
  if (interaction.isButton() && (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('recusar_'))) {
    const isAprovar = interaction.customId.startsWith('aprovar_');
    const alvoId = interaction.customId.split('_')[1];
    const alvo = await interaction.guild.members.fetch(alvoId);
    const embedAntigo = interaction.message.embeds[0];

    if (isAprovar) {
      try {
        await alvo.roles.add("1470481510284132544"); // Cargo Familia

        const desc = embedAntigo.description;
        const match = desc.match(/Nome Real:\s*(.*)/);
        let nomeFicha = match ? match[1].replace(/[*_~]/g, '').trim().split('\n')[0] : alvo.user.username;

        await alvo.setNickname(`[𝒀𝑲𝒁𝒙𝑭𝑴𝑳] ${nomeFicha}`).catch(() => console.log("Erro Nick."));
      } catch (e) { console.log("Erro Aprovação: " + e.message); }
    }

    const canalId = isAprovar ? "1475596732292137021" : "1475705535700664330";
    const canalFinal = interaction.guild.channels.cache.get(canalId);
    
    if (canalFinal) {
      const embedFinal = new EmbedBuilder()
        .setColor(isAprovar ? '#77dd77' : '#ff6961')
        .setTitle(isAprovar ? '🏮 Membro Aceite' : '❌ Recusado')
        .setDescription(embedAntigo.description + `\n\n🛡️ **Decidido por:** ${interaction.user}`);
      await canalFinal.send({ content: isAprovar ? `Parabéns ${alvo}!` : "", embeds: [embedFinal] });
    }

    await interaction.message.delete();
    await interaction.reply({ content: "Concluído!", ephemeral: true });
  }
});

const commands = [
  new SlashCommandBuilder().setName('setup').setDescription('Botão candidatura'),
  new SlashCommandBuilder().setName('julgar').setDescription('Tribunal')
    .addUserOption(o => o.setName('usuario').setDescription('O réu').setRequired(true))
    .addStringOption(o => o.setName('veredito').setDescription('Veredito').setRequired(true).addChoices({name:'Culpado', value:'culpado'}, {name:'Inocente', value:'inocente'}))
    .addStringOption(o => o.setName('motivo').setDescription('Crime'))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => { try { await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands }); } catch (e) {} })();

const app = express();
app.get("/", (req, res) => res.send("Bot Online"));
app.listen(process.env.PORT || 3000, '0.0.0.0');
client.login(process.env.TOKEN);