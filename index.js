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

// --- GESTÃO DE DADOS (TRIBUNAL) ---
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
        const cargoPrisaoId = "1476573034855796927"; // ID Prisioneiro 🚨
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
    }
  }

  // 2. ABRIR FORMULÁRIO (NÃO ALTERA NOME AQUI)
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

  // 3. RECEBER FORMULÁRIO (ENVIA PARA PENDENTES SEM MUDAR O NICK)
  if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {
    await interaction.reply({ content: "Sua ficha foi enviada para análise! 🌸", ephemeral: true });

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

  // 4. APROVAR (ENTREGA CARGO, MUDA NICK E REMOVE "SEM CARGO")
  if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
    const alvoId = interaction.customId.split('_')[1];
    const alvo = await interaction.guild.members.fetch(alvoId);
    const embedAntigo = interaction.message.embeds[0];

    try {
      // 1. Adiciona o cargo de Família e remove o cargo "Sem Cargo"
      await alvo.roles.add("1470481510284132544"); // | Familia
      await alvo.roles.remove("1472350861719113893"); // | Sem Cargo

      // 2. Extrai o nome da ficha limpando símbolos
      const desc = embedAntigo.description;
      const match = desc.match(/Nome Real:\s*(.*)/);
      let nomeFicha = match ? match[1].replace(/[*_~]/g, '').trim().split('\n')[0] : alvo.user.username;

      // 3. Aplica a Tag estilizada
      await alvo.setNickname(`[𝒀𝑲𝒁𝒙𝑭𝑴𝑳] ${nomeFicha}`).catch(() => console.log("Erro no Nick."));

      // 4. Log de Aprovação
      const canalAprovados = interaction.guild.channels.cache.get("1475596732292137021");
      if (canalAprovados) {
        const embedFinal = new EmbedBuilder()
          .setColor('#77dd77')
          .setTitle('🏮 Membro Aceite no Clã')
          .setDescription(desc + `\n\n🛡️ **Aprovado por:** ${interaction.user}`)
          .setFooter({ text: 'Honra e Lealdade - Sistema May 🌸' });
        await canalAprovados.send({ content: `Parabéns ${alvo}!`, embeds: [embedFinal] });
      }

      await interaction.message.delete();
      await interaction.reply({ content: "Aprovado e cargos atualizados!", ephemeral: true });

    } catch (e) {
      console.log("Erro na aprovação: " + e.message);
    }
  }

  // 5. RECUSAR
  if (interaction.isButton() && interaction.customId.startsWith('recusar_')) {
    const alvoId = interaction.customId.split('_')[1];
    const canalRecusados = interaction.guild.channels.cache.get("1475705535700664330");
    if (canalRecusados) {
      const embedFinal = new EmbedBuilder()
        .setColor('#ff6961')
        .setTitle('❌ Candidatura Recusada')
        .setDescription(interaction.message.embeds[0].description + `\n\n🛡️ **Recusado por:** ${interaction.user}`);
      await canalRecusados.send({ embeds: [embedFinal] });
    }
    await interaction.message.delete();
    await interaction.reply({ content: "Recusado!", ephemeral: true });
  }
});

// --- REGISTO DE COMANDOS ---
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