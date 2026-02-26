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

// --- BASE DE DADOS LOCAL ---
const DB_FILE = 'prisao.json';
const lerDados = () => fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
const salvarDados = (d) => fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));

client.on('interactionCreate', async interaction => {
  
  // 1. COMANDO DE JULGAMENTO (VISUAL FICHA)
  if (interaction.isChatInputCommand() && interaction.commandName === 'julgar') {
    const alvo = interaction.options.getMember('usuario');
    const veredito = interaction.options.getString('veredito');
    const motivo = interaction.options.getString('motivo') || "Sem motivo";
    const canalPrisaoId = "1476577042857201684";

    if (veredito === 'culpado') {
      const dados = lerDados();
      dados[alvo.id] = { user: alvo.user.tag, crimes: (dados[alvo.id]?.crimes || 0) + 1 };
      salvarDados(dados);

      const tempoMin = 5 + ((dados[alvo.id].crimes - 1) * 5);
      const ranking = Object.values(dados).sort((a,b) => b.crimes - a.crimes).slice(0,3)
        .map((u, i) => `${i+1}º **${u.user}**: ${u.crimes} crimes`).join('\n');

      try {
        const cargo = interaction.guild.roles.cache.find(r => r.name === "Prisioneiro 🚨");
        if (cargo) await alvo.roles.add(cargo); 
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
        await canalPrisao.send({ embeds: [embed] });
        await interaction.reply({ content: "✅ Registado na Prisão.", ephemeral: true });
      }
    }
  }

  // 2. CORREÇÃO DO FORMULÁRIO (EVITA O ERRO 40060)
  if (interaction.isButton() && interaction.customId === 'abrir_form') {
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

  // 3. PROCESSAMENTO DO MODAL COM RESPOSTA ÚNICA
  if (interaction.isModalSubmit() && interaction.customId === 'form_comunidade') {
    // Respondemos imediatamente para evitar que a interação expire
    await interaction.reply({ content: "Enviando sua ficha... 🌸", ephemeral: true });

    const staffCanal = interaction.guild.channels.cache.get("1475596507456475146");
    const embedStaff = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🏮 Nova Ficha de Recrutamento')
      .setDescription(
        `👤 **Membro:** ${interaction.user}\n` +
        `📝 **Nome:** ${interaction.fields.getTextInputValue('nome')}\n` +
        `🎮 **Roblox:** ${interaction.fields.getTextInputValue('roblox')}\n` +
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
});

// ... (Resto do código de setup e servidor express igual)
client.login(process.env.TOKEN);