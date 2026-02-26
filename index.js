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

// --- GESTÃO DE DADOS ---
const DB_FILE = 'prisao.json';
const lerDados = () => fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
const salvarDados = (d) => fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));

client.on('interactionCreate', async interaction => {
  
  // 1. COMANDO DE JULGAMENTO
  if (interaction.isChatInputCommand() && interaction.commandName === 'julgar') {
    const alvo = interaction.options.getMember('usuario');
    const veredito = interaction.options.getString('veredito');
    const motivo = interaction.options.getMember('usuario') ? interaction.options.getString('motivo') || "Sem motivo" : "Sem motivo";

    if (veredito === 'culpado') {
      const dados = lerDados();
      dados[alvo.id] = { user: alvo.user.tag, crimes: (dados[alvo.id]?.crimes || 0) + 1 };
      salvarDados(dados);
      const tempoMin = 5 + ((dados[alvo.id].crimes - 1) * 5);
      
      try {
        const cargoPrisao = interaction.guild.roles.cache.find(r => r.name === "Prisioneiro 🚨");
        if (cargoPrisao) await alvo.roles.add(cargoPrisao); 
        await alvo.timeout(tempoMin * 60 * 1000, motivo); 
      } catch (e) { console.log("Erro permissão: Alvo imune."); }

      const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('⚖️ **SENTENÇA PROFERIDA** ⚖️')
        .setDescription(`👤 **Membro:** ${alvo}\n📝 **Motivo:** ${motivo}\n⏳ **Pena:** ${tempoMin} min`)
        .setFooter({ text: 'Honra e Lealdade - Sistema May 🌸' });

      await interaction.reply({ embeds: [embed] });
    }
  }

  // 2. ABRIR FORMULÁRIO (NÃO DÁ CARGO AQUI!)
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

  // 3. RECEBER FORMULÁRIO (SÓ ENVIA PARA STAFF)
  if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {
    await interaction.reply({ content: "Enviado para análise da Staff! 🌸", ephemeral: true });

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

  // 4. APROVAR / RECUSAR (O CARGO SÓ É DADO AQUI!)
  if (interaction.isButton() && (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('recusar_'))) {
    const isAprovar = interaction.customId.startsWith('aprovar_');
    const alvoId = interaction.customId.split('_')[1];
    const alvo = await interaction.guild.members.fetch(alvoId);
    const embedAntigo = interaction.message.embeds[0];

    if (isAprovar) {
      try {
        // 1. CARGO SÓ AO CLICAR EM APROVAR
        await alvo.roles.add("1470481510284132544");

        // 2. BUSCA DO NOME CORRIGIDA (EVITA UNDEFINED)
        const desc = embedAntigo.description;
        const match = desc.match(/Nome Real:\s*(.*)/); // Procura o texto após "Nome Real:"
        const nomeReal = match ? match[1].split('\n')[0].trim() : "Membro";

        // 3. TAG [𝒀𝑲𝒁𝒙𝑭𝑴𝑳]
        await alvo.setNickname(`[𝒀𝑲𝒁𝒙𝑭𝑴𝑳] ${nomeReal}`).catch(() => console.log("Erro Nick."));
      } catch (e) { console.log("Erro: " + e.message); }
    }

    const canalId = isAprovar ? "1475596732292137021" : "1475705535700664330";
    const canalFinal = interaction.guild.channels.cache.get(canalId);
    
    if (canalFinal) {
      const embedFinal = new EmbedBuilder()
        .setColor(isAprovar ? '#77dd77' : '#ff6961')
        .setTitle(isAprovar ? '🏮 Membro Aceite no Clã' : '❌ Candidatura Recusada')
        .setDescription(embedAntigo.description + `\n\n🛡️ **Decidido por:** ${interaction.user}`)
        .setFooter({ text: 'Honra e Lealdade - Sistema May 🌸' });
      
      await canalFinal.send({ content: isAprovar ? `Parabéns ${alvo}!` : "", embeds: [embedFinal] });
    }

    await interaction.message.delete();
    await interaction.reply({ content: "Concluído!", ephemeral: true });
  }
});

// --- REGISTO ---
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