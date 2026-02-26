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
  SlashCommandBuilder,
  EmbedBuilder 
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

// --- GESTÃO DO RANKING ---
const DB_FILE = 'prisao.json';
const lerDados = () => fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
const salvarDados = (d) => fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));

client.on('interactionCreate', async interaction => {
  
  // 1. COMANDO DE JULGAMENTO (VISUAL YAKUZA)
  if (interaction.isChatInputCommand() && interaction.commandName === 'julgar') {
    const alvo = interaction.options.getMember('usuario');
    const veredito = interaction.options.getString('veredito');
    const motivo = interaction.options.getString('motivo') || "Sem motivo especificado";
    const canalPrisaoId = "1476577042857201684"; // Teu ID de Prisão

    if (veredito === 'culpado') {
      const dados = lerDados();
      dados[alvo.id] = { user: alvo.user.tag, crimes: (dados[alvo.id]?.crimes || 0) + 1 };
      salvarDados(dados);

      const tempoMin = 5 + ((dados[alvo.id].crimes - 1) * 5); // Escala de 5 em 5 min
      const ranking = Object.values(dados).sort((a,b) => b.crimes - a.crimes).slice(0,3)
        .map((u, i) => `${i+1}º **${u.user}**: ${u.crimes} crimes`).join('\n');

      try {
        const cargo = interaction.guild.roles.cache.find(r => r.name === "Prisioneiro 🚨");
        if (cargo) await alvo.roles.add(cargo); 
        await alvo.timeout(tempoMin * 60 * 1000, motivo); 
      } catch (e) { console.log("Erro de permissão: Dono ou Admin imune."); }

      // EMBED COM O VISUAL DAS TUAS FICHAS
      const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('⚖️ **SENTENÇA PROFERIDA** ⚖️')
        .setThumbnail('https://i.imgur.com/8S77vS7.png') // Martelo da Justiça
        .setDescription(
          `👤 **Membro:** ${alvo}\n` +
          `📝 **Motivo:** ${motivo}\n` +
          `⏳ **Pena:** ${tempoMin} min\n\n` +
          `🏆 **RANKING DE CRIMINOSOS:**\n${ranking}`
        )
        .setFooter({ 
          text: 'Honra e Lealdade - Sistema May 🌸', 
          iconURL: interaction.guild.iconURL() 
        })
        .setTimestamp();

      const canalPrisao = interaction.guild.channels.cache.get(canalPrisaoId);
      if (canalPrisao) {
        await canalPrisao.send({ content: `🚨 **DETENTO CHEGANDO:** ${alvo}`, embeds: [embed] });
        await interaction.reply({ content: `✅ Sentença aplicada! Vê em <#${canalPrisaoId}>`, ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed] });
      }

      // LIBERTAÇÃO AUTOMÁTICA
      setTimeout(async () => {
        try {
          const cargo = interaction.guild.roles.cache.find(r => r.name === "Prisioneiro 🚨");
          if (cargo) await alvo.roles.remove(cargo); 
          if (canalPrisao) await canalPrisao.send(`🔓 **LIBERDADE:** ${alvo} cumpriu a pena e foi solto.`);
        } catch (e) {}
      }, tempoMin * 60 * 1000);

    } else {
      await interaction.reply({ content: `😂 ${alvo} foi considerado inocente desta vez!` });
    }
  }

  // 2. SISTEMA DE RECRUTAMENTO (BOTÕES)
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('recusar_')) {
      const isAprovar = interaction.customId.startsWith('aprovar_');
      const canalId = isAprovar ? "1475596732292137021" : "1475705535700664330";
      const canal = interaction.guild.channels.cache.get(canalId);
      
      const embedFinal = new EmbedBuilder()
        .setColor(isAprovar ? '#77dd77' : '#ff6961')
        .setTitle(isAprovar ? '🏮 Membro Aceite no Clã' : '❌ Candidatura Recusada')
        .setDescription(`${interaction.message.content}\n\n🛡️ **Decidido por:** ${interaction.user}`)
        .setFooter({ text: 'Honra e Lealdade - Sistema May 🌸' });

      if (canal) await canal.send({ embeds: [embedFinal] });
      await interaction.message.delete();
      return interaction.reply({ content: "Candidatura processada!", ephemeral: true });
    }

    if (interaction.customId === 'abrir_form') {
      const modal = new ModalBuilder().setCustomId('form_comunidade').setTitle('Ficha de Candidatura');
      const campos = [
        { id: 'nome', label: 'Nome Real' },
        { id: 'roblox', label: 'Roblox User' },
        { id: 'idade', label: 'Idade' },
        { id: 'recrutador', label: 'Quem te recrutou?' }
      ].map(c => new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId(c.id).setLabel(c.label).setStyle(TextInputStyle.Short)
      ));
      modal.addComponents(...campos);
      await interaction.showModal(modal);
    }
  }

  // 3. RECEBIMENTO DO FORMULÁRIO (MODAL)
  if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {
    const staffCanal = interaction.guild.channels.cache.get("1475596507456475146");
    const nome = interaction.fields.getTextInputValue('nome');
    const roblox = interaction.fields.getTextInputValue('roblox');
    const idade = interaction.fields.getTextInputValue('idade');
    const recrutador = interaction.fields.getTextInputValue('recrutador');

    const embedStaff = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🏮 Nova Ficha de Recrutamento')
      .setThumbnail(interaction.guild.iconURL())
      .setDescription(
        `👤 **Membro:** ${interaction.user}\n` +
        `📝 **Nome Real:** ${nome}\n` +
        `🎮 **Roblox User:** ${roblox}\n` +
        `🎂 **Idade:** ${idade}\n` +
        `🤝 **Recrutador:** ${recrutador}`
      )
      .setFooter({ text: 'Honra e Lealdade - Sistema May 🌸' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    await staffCanal.send({ embeds: [embedStaff], components: [row] });
    await interaction.reply({ content: "Candidatura enviada para a Staff! 🌸", ephemeral: true });
  }
});

// --- REGISTO DOS COMANDOS ---
const commands = [
  new SlashCommandBuilder().setName('setup').setDescription('Cria o botão de candidatura'),
  new SlashCommandBuilder().setName('julgar').setDescription('Tribunal Sakura')
    .addUserOption(o => o.setName('usuario').setDescription('O réu').setRequired(true))
    .addStringOption(o => o.setName('veredito').setDescription('Culpado ou Inocente?').setRequired(true).addChoices({name:'Culpado', value:'culpado'}, {name:'Inocente', value:'inocente'}))
    .addStringOption(o => o.setName('motivo').setDescription('O crime cometido'))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try { await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands }); } catch (e) { console.error(e); }
})();

const app = express();
app.get("/", (req, res) => res.send("Bot Sakura Online 🔥"));
app.listen(process.env.PORT || 3000, '0.0.0.0');

client.login(process.env.TOKEN);