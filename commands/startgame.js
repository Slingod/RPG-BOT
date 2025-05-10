import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('startgame')
  .setDescription('Crée une nouvelle session de jeu')
  .addIntegerOption(option =>
    option.setName('joueurs')
      .setDescription('Nombre de joueurs attendus (1–7)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(7)
  );

export async function execute(interaction, client) {
  const expectedPlayers = interaction.options.getInteger('joueurs');
  client.sessions.set(interaction.channelId, {
    channelId: interaction.channelId,
    expectedPlayers,
    players: new Map(),
    order: [],
    turn: 1,
    maxTurns: 10,
    started: false
  });

  // Confirmation privée
  await interaction.reply({
    content: `Nouvelle partie créée ! En attente de ${expectedPlayers} joueur(s)...`,
    ephemeral: true
  });

  // Annonce publique + bouton Rejoindre
  const channel = client.channels.cache.get(process.env.ANNOUNCE_CHANNEL_ID) || interaction.channel;
  await channel.send('🎮 Une nouvelle partie commence ! Cliquez sur 🔹 pour rejoindre.');

  const joinBtn = new ButtonBuilder()
    .setCustomId('join_game')
    .setLabel('🔹 Rejoindre')
    .setStyle(ButtonStyle.Primary);

  await channel.send({
    components: [
      new ActionRowBuilder().addComponents(joinBtn)
    ]
  });
}