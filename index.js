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

// --- BANCO DE DADOS SIMPLES ---
const DB_FILE = 'prisao.json';
const lerDados = () => fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
const salvarDados = (d) => fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));

client.on('interactionCreate', async interaction => {
  
  // 1. COMANDO JULGAR
  if (interaction.isChatInputCommand() && interaction.commandName === 'julgar') {
    const alvo = interaction.options.getMember('usuario');
    const veredito = interaction.options.getString('veredito');
    const motivo = interaction.options.getString('motivo') || "Sem motivo";

    if (veredito === 'culpado') {
      const dados = lerDados();
      dados[alvo.id] = { user: alvo.user.tag, crimes: (dados[alvo.id]?.crimes || 0) + 1 };
      salvarDados(dados);
      const tempoMin = 5 + ((dados[alvo.id].crimes - 1) * 5);

      try {
        await alvo.roles.add("1476573034855796927"); // ID Prisioneiro
        await alvo.timeout(tempoMin * 60 * 1000, motivo);
        
        const embed = new EmbedBuilder()
          .setColor('#FFFF00')
          .setTitle('⚖️ SENTENÇA PROFERIDA')
          .setDescription(`👤 **Réu:** ${alvo}\n📝 **Motivo:** ${motivo}\n⏳ **Pena:** ${tempoMin} min`)
          .setFooter({ text: 'Sistema May 🌸' });

        await interaction.reply({ embeds: [embed] });
      } catch (e) {
        await interaction.reply({ content: "Erro de permissão: Verifique a hierarquia!", ephemeral: true });
      }
    } else {
      await interaction.reply({ content: `⚖️ ${alvo} foi declarado inocente!` });
    }
  }

  // 2. COMANDO SOLTAR
  if (interaction.isChatInputCommand() && interaction.commandName === 'soltar') {
    const alvo = interaction.options.getMember('usuario');
    try {
      await alvo.roles.remove("1476573034855796927"); // Remove Prisioneiro
      await alvo.timeout(null);
      await interaction.reply({ content: `✅ ${alvo} foi solto com sucesso!` });
    } catch (e) {
      await interaction.reply({ content: "Erro ao soltar: Verifique a hierarquia!", ephemeral: true });
    }
  }

  // 3. FORMULÁRIO (BOTÃO)
  if (interaction.isButton() && interaction.customId === 'abrir_form') {
    const modal = new ModalBuilder().setCustomId('form_comunidade').setTitle('Ficha de Candidatura');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome Real').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox').setLabel('Roblox User').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('idade').setLabel('Idade').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('recrutador').setLabel('Quem te recrutou?').setStyle(TextInputStyle.Short).setRequired(true))
    );
    await interaction.showModal(modal);
  }

  // 4. RECEBER FICHA (PENDENTES)
  if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {
    const staffCanal = interaction.guild.channels.cache.get("1475596507456475146");
    const nome = interaction.fields.getTextInputValue('nome');
    
    const embedStaff = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🏮 Nova Ficha de Recrutamento')
      .setDescription(`👤 **Membro:** ${interaction.user}\n📝 **Nome Real:** ${nome}\n🎮 **Roblox:** ${interaction.fields.getTextInputValue('roblox')}\n🤝 **Recrutador:** ${interaction.fields.getTextInputValue('recrutador')}`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    await staffCanal.send({ embeds: [embedStaff], components: [row] });
    await interaction.reply({ content: "Ficha enviada!", ephemeral: true });
  }

  // 5. BOTÃO APROVAR
  if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
    const alvoId = interaction.customId.split('_')[1];
    const alvo = await interaction.guild.members.fetch(alvoId);
    
    try {
      await alvo.roles.add("1470481510284132544"); // Familia
      await alvo.roles.remove("1472350861719113893"); // Remove Sem Cargo
      
      const nomeFicha = interaction.message.embeds[0].description.match(/Nome Real:\s*(.*)/)[1];
      await alvo.setNickname(`[𝒀𝑲𝒁𝒙𝑭𝑴𝑳] ${nomeFicha.replace(/[*_~]/g, '')}`); //

      await interaction.message.delete();
      await interaction.reply({ content: "Membro aprovado!", ephemeral: true });
    } catch (e) { console.log(e); }
  }
});

// --- SETUP COMANDOS ---
const commands = [
  new SlashCommandBuilder().setName('julgar').setDescription('Tribunal')
    .addUserOption(o => o.setName('usuario').setDescription('O réu').setRequired(true))
    .addStringOption(o => o.setName('veredito').setDescription('Culpado ou Inocente').setRequired(true).addChoices({name:'Culpado', value:'culpado'}, {name:'Inocente', value:'inocente'}))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo do crime')),
  new SlashCommandBuilder().setName('soltar').setDescription('Liberta da prisão').addUserOption(o => o.setName('usuario').setDescription('O prisioneiro').setRequired(true)),
  new SlashCommandBuilder().setName('setup').setDescription('Cria o botão de ficha')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log("Comandos registrados!");
  } catch (e) { console.error(e); }
})();

const app = express();
app.get("/", (req, res) => res.send("Online"));
app.listen(process.env.PORT || 3000);
client.login(process.env.TOKEN);