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

// --- GESTÃO DE DADOS (RANKING) ---
const DB_FILE = 'prisao.json';
const lerDados = () => fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
const salvarDados = (d) => fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));

client.on('interactionCreate', async interaction => {
  
  // 1. COMANDO DE JULGAMENTO (TRIBUNAL)
  if (interaction.isChatInputCommand() && interaction.commandName === 'julgar') {
    const alvo = interaction.options.getMember('usuario');
    const veredito = interaction.options.getString('veredito');
    const motivo = interaction.options.getString('motivo') || "Culpado de ser chato";
    const canalPrisaoId = "1476577042857201684"; // ID da tua aba Prisao

    if (veredito === 'culpado') {
      const dados = lerDados();
      dados[alvo.id] = { user: alvo.user.tag, crimes: (dados[alvo.id]?.crimes || 0) + 1 };
      salvarDados(dados);

      const tempoMin = 5 + ((dados[alvo.id].crimes - 1) * 5); // Pena escala 5m por crime
      const ranking = Object.values(dados).sort((a,b) => b.crimes - a.crimes).slice(0,3)
        .map((u, i) => `${i+1}º **${u.user}**: ${u.crimes} crimes`).join('\n');

      try {
        // Usa o nome exato do cargo com o emoji
        const cargo = interaction.guild.roles.cache.find(r => r.name === "Prisioneiro 🚨");
        if (cargo) await alvo.roles.add(cargo); 
        await alvo.timeout(tempoMin * 60 * 1000, motivo); // Timeout real do Discord
      } catch (e) { console.error("Erro ao aplicar punição. Verifica a hierarquia!"); }

      const embed = new EmbedBuilder()
        .setColor('#FFFF00') // Amarelo estilo balão de aviso
        .setTitle('⚖️ **SENTENÇA PROFERIDA** ⚖️')
        .setThumbnail('https://i.imgur.com/8S77vS7.png')
        .setDescription(`🚨 ${alvo} foi preso!\n\n**Motivo:** ${motivo}\n**Pena:** ${tempoMin} min\n\n🏆 **RANKING DE CRIMINOSOS:**\n${ranking}`)
        .setImage('https://i.imgur.com/6pYV59C.png'); // Balão de cartoon

      const canalPrisao = interaction.guild.channels.cache.get(canalPrisaoId);
      if (canalPrisao) {
        await canalPrisao.send({ content: `🚨 **DETENTO CHEGANDO:** ${alvo}`, embeds: [embed] });
        await interaction.reply({ content: `Sentença aplicada! Vê em <#${canalPrisaoId}>`, ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed] });
      }

      // REMOÇÃO AUTOMÁTICA DO CARGO
      setTimeout(async () => {
        try {
          const cargo = interaction.guild.roles.cache.find(r => r.name === "Prisioneiro 🚨");
          if (cargo) await alvo.roles.remove(cargo); 
          if (canalPrisao) await canalPrisao.send(`🔓 **LIBERDADE:** ${alvo} cumpriu a pena.`);
        } catch (e) {}
      }, tempoMin * 60 * 1000);

    } else {
      await interaction.reply({ content: `😂 **INOCENTE!** O réu ${alvo} fez um teatro e foi solto.` });
    }
  }

  // 2. SISTEMA DE CANDIDATURAS (BOTÕES)
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('recusar_')) {
      const isAprovar = interaction.customId.startsWith('aprovar_');
      const canalId = isAprovar ? "1475596732292137021" : "1475705535700664330";
      const canal = interaction.guild.channels.cache.get(canalId);
      
      const embedFinal = new EmbedBuilder()
        .setColor(isAprovar ? '#77dd77' : '#ff6961')
        .setTitle(isAprovar ? '🌸 Candidatura Aceite' : '❌ Candidatura Recusada')
        .setDescription(`🛡️ **Staff:** ${interaction.user}\n\n**Dados:**\n${interaction.message.content}`);

      if (canal) await canal.send({ embeds: [embedFinal] });
      await interaction.message.delete();
      return interaction.reply({ content: "Processado!", ephemeral: true });
    }

    if (interaction.customId === 'abrir_form') {
      const modal = new ModalBuilder().setCustomId('form_comunidade').setTitle('Ficha de Candidatura');
      const campos = ['Nome', 'Roblox', 'Idade', 'Recrutador'].map(c => 
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(c.toLowerCase()).setLabel(c).setStyle(TextInputStyle.Short))
      );
      modal.addComponents(...campos);
      await interaction.showModal(modal);
    }
  }

  // 3. RECEBIMENTO DO FORMULÁRIO (MODAL)
  if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {
    const staffCanal = interaction.guild.channels.cache.get("1475596507456475146");
    const dados = `👤 **Candidato:** ${interaction.user}\n📝 **Nome:** ${interaction.fields.getTextInputValue('nome')}\n🎮 **Roblox:** ${interaction.fields.getTextInputValue('roblox')}`;
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    await staffCanal.send({ content: dados, components: [row] });
    await interaction.reply({ content: "Enviado com sucesso! 🌸", ephemeral: true });
  }
});

// --- REGISTO DOS COMANDOS SLASH ---
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

// --- SERVIDOR PARA O RENDER ---
const app = express();
app.get("/", (req, res) => res.send("Bot Sakura Online 🔥"));
app.listen(process.env.PORT || 3000, '0.0.0.0');

client.login(process.env.TOKEN);