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

// --- BANCO DE DADOS ---
const DB_FILE = 'prisao.json';
const lerDados = () => fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
const salvarDados = (d) => fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));

client.on('interactionCreate', async interaction => {
  
  // 1. COMANDO SETUP (PARA CRIAR O BOTÃO)
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
    const embed = new EmbedBuilder()
      .setColor('#ffb6c1')
      .setTitle('🏮 Recrutamento YKZ')
      .setDescription('Clica no botão abaixo para enviares a tua candidatura para a nossa família!');
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('abrir_form').setLabel('Enviar Ficha').setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // 2. ABRIR FORMULÁRIO
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

  // 3. RECEBER FORMULÁRIO (CORRIGIDO)
  if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {
    try {
      // Respondemos logo para o Discord não dar erro de "não respondeu"
      await interaction.reply({ content: "A processar o teu envio... 🌸", ephemeral: true });

      const staffCanal = interaction.guild.channels.cache.get("1475596507456475146");
      if (!staffCanal) throw new Error("Canal de Staff não encontrado.");

      const nome = interaction.fields.getTextInputValue('nome');
      const roblox = interaction.fields.getTextInputValue('roblox');
      const idade = interaction.fields.getTextInputValue('idade');
      const recrutador = interaction.fields.getTextInputValue('recrutador');

      const embedStaff = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('🏮 Nova Ficha de Recrutamento')
        .setDescription(`👤 **Membro:** ${interaction.user}\n📝 **Nome Real:** ${nome}\n🎮 **Roblox:** ${roblox}\n🎂 **Idade:** ${idade}\n🤝 **Recrutador:** ${recrutador}`)
        .setFooter({ text: 'Honra e Lealdade - Sistema May 🌸' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
      );

      await staffCanal.send({ embeds: [embedStaff], components: [row] });
      await interaction.editReply({ content: "A tua ficha foi enviada com sucesso! Aguarda a análise. 🌸" });

    } catch (e) {
      console.error(e);
      await interaction.editReply({ content: "❌ Erro ao enviar a ficha. Avisa um administrador." });
    }
  }

  // 4. APROVAR (COM CORREÇÃO DE NICK)
  if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
    const alvoId = interaction.customId.split('_')[1];
    const alvo = await interaction.guild.members.fetch(alvoId);
    
    try {
      await alvo.roles.add("1470481510284132544"); // Familia
      await alvo.roles.remove("1472350861719113893"); // Sem Cargo
      
      const desc = interaction.message.embeds[0].description;
      const nomeMatch = desc.match(/Nome Real:\s*(.*)/);
      const nomeFicha = nomeMatch ? nomeMatch[1].replace(/[*_~]/g, '').trim() : "Membro";

      await alvo.setNickname(`[𝒀𝑲𝒁𝒙𝑭𝑴𝑳] ${nomeFicha}`).catch(() => console.log("Erro ao mudar nick"));

      await interaction.message.delete();
      await interaction.reply({ content: `✅ ${alvo.user.username} aprovado!`, ephemeral: true });
    } catch (e) {
      console.error(e);
      await interaction.reply({ content: "Erro na aprovação. Verifica os cargos!", ephemeral: true });
    }
  }

  // 5. JULGAR (IGUAL AO ANTERIOR COM DEFER)
  if (interaction.isChatInputCommand() && interaction.commandName === 'julgar') {
    await interaction.deferReply();
    const alvo = interaction.options.getMember('usuario');
    const veredito = interaction.options.getString('veredito');

    if (veredito === 'culpado') {
      try {
        await alvo.roles.add("1476573034855796927"); // Prisioneiro
        await interaction.editReply({ content: `⚖️ ${alvo} foi preso!` });
      } catch (e) {
        await interaction.editReply({ content: "Erro de hierarquia!" });
      }
    }
  }
});

// --- REGISTO ---
const commands = [
  new SlashCommandBuilder().setName('setup').setDescription('Cria o botão de ficha'),
  new SlashCommandBuilder().setName('julgar').setDescription('Tribunal')
    .addUserOption(o => o.setName('usuario').setDescription('O réu').setRequired(true))
    .addStringOption(o => o.setName('veredito').setDescription('Culpado ou Inocente').setRequired(true).addChoices({name:'Culpado', value:'culpado'}, {name:'Inocente', value:'inocente'})),
  new SlashCommandBuilder().setName('soltar').setDescription('Liberta da prisão').addUserOption(o => o.setName('usuario').setDescription('O prisioneiro').setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log("Comandos OK!");
  } catch (e) { console.error(e); }
})();

const app = express();
app.get("/", (req, res) => res.send("Online"));
app.listen(process.env.PORT || 3000);
client.login(process.env.TOKEN);