// index.js do Bot Discord completo com .env e batch + logs

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
  SlashCommandBuilder 
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

// --- FUNÇÃO DE LOGS ---
function logCandidatura(mensagem) {
  const logLine = `[${new Date().toLocaleString()}] ${mensagem}\n`;
  fs.appendFileSync('logs_candidaturas.txt', logLine);
}

// --- EVENTO DE INTERAÇÃO (BOTÕES E FORMULÁRIO) ---
client.on('interactionCreate', async interaction => {
  
  // 1. LÓGICA DOS BOTÕES (APROVAR / RECUSAR)
  if (interaction.isButton()) {
    const isAprovar = interaction.customId.startsWith('aprovar_');
    const isRecusar = interaction.customId.startsWith('recusar_');

    if (isAprovar || isRecusar) {
      // IDs dos Canais (Verifique se estes são os IDs corretos no seu servidor)
      const canalDestinoId = isAprovar ? "1475596732292137021" : "1475705535700664330";
      const canalDestino = interaction.guild.channels.cache.get(canalDestinoId);
      
      if (!canalDestino) {
        return interaction.reply({ content: "❌ Canal de destino não encontrado!", ephemeral: true });
      }

      // Recupera o conteúdo da candidatura que estava na mensagem
      const candidaturaConteudo = interaction.message.content;
      const statusEmoji = isAprovar ? "✅" : "❌";
      const statusTexto = isAprovar ? "APROVADA" : "RECUSADA";

      // Envia para o canal final com o nome do Staff que clicou
      await canalDestino.send({
        content: `${statusEmoji} **CANDIDATURA ${statusTexto}**\n\n` +
                 `🛡️ **Staff Responsável:** ${interaction.user}\n` +
                 `━━━━━━━━━━━━━━━━━━\n` +
                 `${candidaturaConteudo}`
      });

      // Apaga a mensagem original do canal de pendentes
      await interaction.message.delete();

      return interaction.reply({
        content: `Candidatura movida para ${isAprovar ? "aprovados" : "recusados"}!`,
        ephemeral: true
      });
    }

    // 2. LÓGICA PARA ABRIR O MODAL
    if (interaction.customId === 'abrir_form') {
      const modal = new ModalBuilder()
        .setCustomId('form_comunidade')
        .setTitle('Candidatura Comunidade');

      const nome = new TextInputBuilder().setCustomId('nome').setLabel('Qual é o teu nome?').setStyle(TextInputStyle.Short);
      const robloxUser = new TextInputBuilder().setCustomId('roblox').setLabel('User do Roblox').setStyle(TextInputStyle.Short);
      const idade = new TextInputBuilder().setCustomId('idade').setLabel('Qual é a tua idade?').setStyle(TextInputStyle.Short);
      const recrutador = new TextInputBuilder().setCustomId('recrutador').setLabel('Quem te recrutou?').setStyle(TextInputStyle.Short);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nome),
        new ActionRowBuilder().addComponents(robloxUser),
        new ActionRowBuilder().addComponents(idade),
        new ActionRowBuilder().addComponents(recrutador)
      );

      await interaction.showModal(modal);
    }
  }

  // 3. LÓGICA DO ENVIO DO FORMULÁRIO (MODAL)
  if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {
    const nome = interaction.fields.getTextInputValue('nome');
    const roblox = interaction.fields.getTextInputValue('roblox');
    const idade = interaction.fields.getTextInputValue('idade');
    const recrutador = interaction.fields.getTextInputValue('recrutador');

    const staffCanal = interaction.guild.channels.cache.get("1475596507456475146");
    if (!staffCanal) return;

    const aprovar = new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success);
    const recusar = new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(aprovar, recusar);

    const mensagem = `📋 **Nova Candidatura**\n👤 **Utilizador:** ${interaction.user}\n📝 **Nome:** ${nome}\n🎮 **User do Roblox:** ${roblox}\n🎂 **Idade:** ${idade}\n🤝 **Quem recrutou:** ${recrutador}`;
    
    await staffCanal.send({ content: mensagem, components: [row] });
    logCandidatura(mensagem);
    
    await interaction.reply({ content: "Candidatura enviada com sucesso!", ephemeral: true });
  }
});

// --- REGISTRO DE COMANDOS SLASH (/setup) ---
const commands = [
  new SlashCommandBuilder().setName('setup').setDescription('Enviar painel de candidatura')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Comando /setup registrado!');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
})();

// --- EVENTO: NOVO MEMBRO ---
client.on('guildMemberAdd', async (member) => {
    const role = member.guild.roles.cache.find(r => r.name === "Sem cargo");
    if (role) {
        try {
            await member.roles.add(role);
            console.log(`Cargo adicionado a ${member.user.tag}`);
        } catch (err) {
            console.error("Erro ao adicionar cargo:", err);
        }
    }
});

// --- SERVIDOR WEB (OBRIGATÓRIO PARA O RENDER) ---
const app = express();
app.get("/", (req, res) => res.send("Bot Online 🔥"));
app.get("/health", (req, res) => res.json({ status: "ok" }));

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Web server running on port ${port}`);
});

// --- LOGIN DO BOT ---
client.once('ready', () => console.log('May está online!'));
client.login(process.env.TOKEN);