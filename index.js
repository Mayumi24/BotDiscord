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

// --- SISTEMA DE BASE DE DADOS (JSON) ---
const DB_FILE = 'prisao.json';
function lerDados() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function salvarDados(dados) {
  fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2));
}

// --- INTERAÇÕES ---
client.on('interactionCreate', async interaction => {
  
  // 1. COMANDO /JULGAR (TRIBUNAL)
  if (interaction.isChatInputCommand() && interaction.commandName === 'julgar') {
    const alvo = interaction.options.getMember('usuario');
    const veredito = interaction.options.getString('veredito');
    const motivo = interaction.options.getString('motivo') || "Respirar sem licença";
    
    if (veredito === 'culpado') {
      const dados = lerDados();
      const userId = alvo.id;
      
      if (!dados[userId]) dados[userId] = { user: alvo.user.tag, crimes: 0 };
      dados[userId].crimes += 1;
      
      const tempoMinutos = 5 + ((dados[userId].crimes - 1) * 5);
      salvarDados(dados);

      // Ranking Top 3
      const ranking = Object.values(dados)
        .sort((a, b) => b.crimes - a.crimes)
        .slice(0, 3)
        .map((u, i) => `${i + 1}º **${u.user}**: ${u.crimes} crimes`)
        .join('\n');

      try {
        const cargoPrisao = interaction.guild.roles.cache.find(r => r.name === "Prisioneiro");
        if (cargoPrisao) await alvo.roles.add(cargoPrisao); // Adiciona sem remover outros
        await alvo.timeout(tempoMinutos * 60 * 1000, `Sentença: ${motivo}`);
      } catch (err) { console.error("Erro nas permissões:", err); }

      const embedCulpado = new EmbedBuilder()
        .setColor('#FFFF00') // Amarelo (estilo balão de aviso)
        .setTitle('⚠️ **SENTENÇA PROFERIDA: CULPADO!** ⚠️')
        .setThumbnail('https://i.imgur.com/8S77vS7.png')
        .setDescription(
          `🚨 **RÉU:** ${alvo}\n` +
          `💢 **CRIME:** ${motivo}\n` +
          `⏳ **PENA:** ${tempoMinutos} minutos\n\n` +
          `🏆 **RANKING DE CRIMINOSOS:**\n${ranking}`
        )
        .setImage('https://i.imgur.com/6pYV59C.png') // Balão de cartoon
        .setFooter({ text: 'A justiça é cega, mas o bot vê tudo!' });

      await interaction.reply({ content: `📢 ${alvo} foi preso!`, embeds: [embedCulpado] });

      // REMOÇÃO AUTOMÁTICA DO CARGO
      setTimeout(async () => {
        try {
          const cargo = interaction.guild.roles.cache.find(r => r.name === "Prisioneiro");
          if (cargo && alvo.roles.cache.has(cargo.id)) {
            await alvo.roles.remove(cargo);
            await interaction.channel.send(`🔓 **LIBERDADE:** ${alvo} cumpriu a pena.`);
          }
        } catch (e) { console.log("Erro ao soltar."); }
      }, tempoMinutos * 60 * 1000);

    } else {
      await interaction.reply({ content: `😂 **INOCENTE!** O réu ${alvo} fez um drama e foi solto.` });
    }
  }

  // 2. SISTEMA DE CANDIDATURAS (BOTÕES)
  if (interaction.isButton()) {
    const isAprovar = interaction.customId.startsWith('aprovar_');
    const isRecusar = interaction.customId.startsWith('recusar_');

    if (isAprovar || isRecusar) {
      const canalId = isAprovar ? "1475596732292137021" : "1475705535700664330";
      const canal = interaction.guild.channels.cache.get(canalId);
      
      const embedFinal = new EmbedBuilder()
        .setColor(isAprovar ? '#77dd77' : '#ff6961')
        .setTitle(isAprovar ? '🌸 Candidatura Aceite' : '❌ Candidatura Recusada')
        .setDescription(`🛡️ **Staff:** ${interaction.user}\n\n**Dados:**\n${interaction.message.content}`)
        .setTimestamp();

      if (canal) await canal.send({ embeds: [embedFinal] });
      await interaction.message.delete();
      return interaction.reply({ content: "Processado!", ephemeral: true });
    }

    if (interaction.customId === 'abrir_form') {
      const modal = new ModalBuilder().setCustomId('form_comunidade').setTitle('Candidatura');
      const inputs = ['Nome', 'Roblox', 'Idade', 'Recrutador'].map(label => 
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId(label.toLowerCase()).setLabel(label).setStyle(TextInputStyle.Short)
        )
      );
      modal.addComponents(...inputs);
      await interaction.showModal(modal);
    }
  }

  // 3. RECEBIMENTO DO FORMULÁRIO
  if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {
    const staffCanal = interaction.guild.channels.cache.get("1475596507456475146");
    const nome = interaction.fields.getTextInputValue('nome');
    const roblox = interaction.fields.getTextInputValue('roblox');
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    const msg = `👤 **Utilizador:** ${interaction.user}\n📝 **Nome:** ${nome}\n🎮 **Roblox:** ${roblox}`;
    await staffCanal.send({ content: msg, components: [row] });
    await interaction.reply({ content: "Enviado! 🌸", ephemeral: true });
  }
});

// --- REGISTRO DE COMANDOS ---
const commands = [
  new SlashCommandBuilder().setName('setup').setDescription('Painel de Candidatura'),
  new SlashCommandBuilder().setName('julgar').setDescription('Julgamento do Tribunal')
    .addUserOption(o => o.setName('usuario').setDescription('O réu').setRequired(true))
    .addStringOption(o => o.setName('veredito').setDescription('Culpado ou Inocente?').setRequired(true).addChoices({name:'Culpado', value:'culpado'}, {name:'Inocente', value:'inocente'}))
    .addStringOption(o => o.setName('motivo').setDescription('O crime'))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN