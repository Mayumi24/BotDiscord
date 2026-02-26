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

// --- GESTÃO DE DADOS (PRISÃO) ---
const DB_FILE = 'prisao.json';
const lerDados = () => fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
const salvarDados = (d) => fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));

client.on('interactionCreate', async interaction => {
  
  // 1. COMANDO DE JULGAMENTO
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
      const ranking = Object.values(dados).sort((a,b) => b.crimes - a.crimes).slice(0,3)
        .map((u, i) => `${i+1}º **${u.user}**: ${u.crimes} crimes`).join('\n');

      try {
        const cargoPrisao = interaction.guild.roles.cache.find(r => r.name === "Prisioneiro 🚨");
        if (cargoPrisao) await alvo.roles.add(cargoPrisao); 
        await alvo.timeout(tempoMin * 60 * 1000, motivo); 
      } catch (e) { console.log("Imunidade detectada."); }

      const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('⚖️ **SENTENÇA PROFERIDA** ⚖️')
        .setThumbnail('https://i.imgur.com/8S77vS7.png')
        .setDescription(
          `👤 **Membro:** ${alvo}\n` +
          `📝 **Motivo:** ${motivo}\n` +
          `⏳ **Pena:** ${tempoMin} min\n\n` +
          `🏆 **RANKING DE CRIMINOSOS:**\n${ranking}`
        )
        .setFooter({ text: 'Honra e Lealdade - Sistema May 🌸', iconURL: interaction.guild.iconURL() });

      const canalPrisao = interaction.guild.channels.cache.get(canalPrisaoId);
      if (canalPrisao) {
        await canalPrisao.send({ content: `🚨 **DETENTO CHEGANDO:** ${alvo}`, embeds: [embed] });
        await interaction.reply({ content: `✅ Sentença aplicada!`, ephemeral: true });
      }
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
    await interaction.reply({ content: "Sua ficha foi enviada para a Staff! 🌸", ephemeral: true }); // Resposta imediata p/ evitar erro 40060

    const staffCanal = interaction.guild.channels.cache.get("1475596507456475146");
    const embedStaff = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🏮 Nova Ficha de Recrutamento')
      .setThumbnail(interaction.guild.iconURL())
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

  // 4. APROVAR / RECUSAR (TAG E CARGO AUTOMÁTICOS)
  if (interaction.isButton() && (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('recusar_'))) {
    const isAprovar = interaction.customId.startsWith('aprovar_');
    const alvoId = interaction.customId.split('_')[1];
    const alvo = await interaction.guild.members.fetch(alvoId);
    
    const canalId = isAprovar ? "1475596732292137021" : "1475705535700664330";
    const canalFinal = interaction.guild.channels.cache.get(canalId);
    const embedAntigo = interaction.message.embeds[0];

    if (isAprovar) {
      try {
        const cargoFamiliaId = "1470481510284132544"; // ID fornecido
        await alvo.roles.add(cargoFamiliaId);

        const nomeReal = embedAntigo.description.split('\n')[1].split(': ')[1]; 
        await alvo.setNickname(`[𝒀𝑲𝒁𝒙𝑭𝑴𝑳] ${nomeReal}`).catch(() => console.log("Erro no Nick.")); // Tag estilizada
      } catch (e) { console.log("Erro permissão cargo: " + e.message); }
    }

    const embedFinal = new EmbedBuilder()
      .setColor(isAprovar ? '#77dd77' : '#ff6961')
      .setTitle(isAprovar ? '🏮 Membro Aceite no Clã' : '❌ Candidatura Recusada')
      .setDescription(embedAntigo.description + `\n\n🛡️ **Decidido por:** ${interaction.user}`)
      .setFooter({ text: 'Honra e Lealdade - Sistema May 🌸' });

    if (canalFinal) await canalFinal.send({ content: isAprovar ? `Parabéns ${alvo}!` : "", embeds: [embedFinal] });
    await interaction.message.delete();
    await interaction.reply({ content: "Processo concluído!", ephemeral: true });
  }
});

// --- REGISTO E SERVER ---
const commands = [
  new SlashCommandBuilder().setName('setup').setDescription('Cria o botão de candidatura'),
  new SlashCommandBuilder().setName('julgar').setDescription('Tribunal Sakura')
    .addUserOption(o => o.setName('usuario').setDescription('O réu').setRequired(true))
    .addStringOption(o => o.setName('veredito').setDescription('Culpado ou Inocente?').setRequired(true).addChoices({name:'Culpado', value:'culpado'}, {name:'Inocente', value:'inocente'}))
    .addStringOption(o => o.setName('motivo').setDescription('O crime'))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try { await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands }); } catch (e) {}
})();

const app = express();
app.get("/", (req, res) => res.send("Bot Online"));
app.listen(process.env.PORT || 3000, '0.0.0.0');
client.login(process.env.TOKEN);