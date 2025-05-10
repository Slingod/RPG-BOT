import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes,
} from 'discord.js';
import { fileURLToPath } from 'url';
import path from 'path';

import {
  Character,
  Fighter,
  Paladin,
  Monk,
  Berzerker,
  Assassin,
  Wizard,
  Ranger
} from './game/classes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const client = new Client({ intents: [ GatewayIntentBits.Guilds ] });
client.sessions = new Map();

// Déploiement /startgame
async function deploy() {
  const commands = [
    new SlashCommandBuilder()
      .setName('startgame')
      .setDescription('Démarrer une nouvelle partie RPG')
      .addIntegerOption(opt =>
        opt.setName('joueurs')
           .setDescription('Nombre de joueurs (1–7)')
           .setRequired(true)
           .setMinValue(1)
           .setMaxValue(7)
      )
      .toJSON()
  ];
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log('✅ /startgame déployée');
}
await deploy();

client.once(Events.ClientReady, () => {
  console.log(`Connecté comme ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  // 1) /startgame
  if (interaction.isChatInputCommand() && interaction.commandName === 'startgame') {
    const n = interaction.options.getInteger('joueurs');
    client.sessions.set(interaction.channelId, {
      expectedPlayers: n,
      players: new Map(),   // userId => { choice }
      order: [],
      turn: 1,
      maxTurns: 10,
      started: false
    });
    await interaction.reply({ content: `Partie pour **${n}** joueur(s) lancée !`, ephemeral: true });
    const ch = client.channels.cache.get(process.env.ANNOUNCE_CHANNEL_ID) || interaction.channel;
    const join = new ButtonBuilder().setCustomId('join_game').setLabel('🔹 Rejoindre').setStyle(ButtonStyle.Primary);
    await ch.send({ content:`Cliquez pour rejoindre 👇`, components:[ new ActionRowBuilder().addComponents(join) ] });
    return;
  }

  // 2) Rejoindre
  if (interaction.isButton() && interaction.customId === 'join_game') {
    const sess = client.sessions.get(interaction.channelId);
    if (!sess) return;
    if (sess.players.has(interaction.user.id)) {
      return interaction.reply({ content:'❗ Vous avez déjà rejoint.', ephemeral:true });
    }
    sess.players.set(interaction.user.id, { choice: null });
    await interaction.reply({ content:'✅ Vous avez rejoint.', ephemeral:true });
    if (sess.players.size === sess.expectedPlayers) {
      // panel de classes...
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('choose_Fighter').setEmoji('⚔️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('choose_Paladin').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('choose_Monk').setEmoji('🙏').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('choose_Berzerker').setEmoji('🔥').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('choose_Assassin').setEmoji('🗡️').setStyle(ButtonStyle.Secondary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('choose_Ranger').setEmoji('🏹').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('choose_Wizard').setEmoji('🧙').setStyle(ButtonStyle.Secondary)
      );
      await interaction.channel.send({ content:'Choisissez votre classe :', components:[row1,row2] });
    }
    return;
  }

  // 3) Choix de classe
  if (interaction.isButton() && interaction.customId.startsWith('choose_')) {
    const sess = client.sessions.get(interaction.channelId);
    const uid  = interaction.user.id;
    if (!sess || !sess.players.has(uid)) {
      return interaction.reply({ content:'❗ Vous n’êtes pas dans la partie.', ephemeral:true });
    }
    const cls = interaction.customId.split('_')[1];
    sess.players.get(uid).choice = cls;
    sess.order.push(uid);
    await interaction.reply({ content:`Vous êtes **${cls}**.`, ephemeral:true });

    // désactive boutons
    const msg = await interaction.message.fetch();
    const rows = msg.components.map(r=>{
      const nr = new ActionRowBuilder();
      for (const c of r.components) {
        const d = c.data;
        const b = new ButtonBuilder()
          .setCustomId(d.custom_id)
          .setStyle(d.style)
          .setDisabled(true);
        if (d.emoji) b.setEmoji(d.emoji);
        if (d.label) b.setLabel(d.label);
        nr.addComponents(b);
      }
      return nr;
    });
    await msg.edit({ components: rows });

    // si tous choisi, on start
    const all = [...sess.players.values()].every(p=>p.choice);
    if (all && !sess.started) {
      sess.started = true;
      // bots pour les manquants
      const taken = new Set([...sess.players.values()].map(p=>p.choice));
      ['Fighter','Paladin','Monk','Berzerker','Assassin','Ranger','Wizard']
        .filter(x=>!taken.has(x))
        .forEach(x=> sess.players.set(`BOT_${x}`,{choice:x}));
      await interaction.channel.send('🎯 Tous prêts ! Le combat commence…');
      return launchCombat(sess, interaction.channel);
    }
    return;
  }
});

// 4) Moteur de combat interactif
async function launchCombat(session, channel) {
  const mapCls = { Fighter, Paladin, Monk, Berzerker, Assassin, Ranger, Wizard };
  // Instanciation de tous les combattants
  session.combatants = new Map();
  for (const [id, p] of session.players.entries()) {
    const name = id.startsWith('BOT_')
      ? `${p.choice}-BOT`
      : channel.guild.members.cache.get(id).displayName;
    const inst = new mapCls[p.choice](name);
    inst.ownerId = id.startsWith('BOT_') ? null : id;
    session.combatants.set(id, inst);
  }

  while (session.turn <= session.maxTurns) {
    // 🔄 Annonce du tour
    await channel.send(`🔄 **Tour ${session.turn}/${session.maxTurns}**`);

    //
    // — A) Tours des joueurs humains —
    //
    for (const humanId of session.order) {
      const human = session.combatants.get(humanId);
      if (!human || !human.alive) continue;

      // 1️⃣ Choix d’action
      const atkBtn = new ButtonBuilder()
        .setCustomId(`act_atk_${humanId}`)
        .setLabel('Attaque normale')
        .setStyle(ButtonStyle.Primary);
      const spcBtn = new ButtonBuilder()
        .setCustomId(`act_spc_${humanId}`)
        .setLabel('Attaque spéciale')
        .setStyle(ButtonStyle.Danger);
      const rowAct = new ActionRowBuilder().addComponents(atkBtn, spcBtn);

      const user = await client.users.fetch(humanId);
      const dm   = await user.send({
        content: `Tour ${session.turn} : quelle action choisissez-vous ?`,
        components: [rowAct]
      });

      const choice = await dm.awaitMessageComponent({
        filter: i => i.user.id === humanId && (
          i.customId === `act_atk_${humanId}` ||
          i.customId === `act_spc_${humanId}`
        ),
        time: 60000
      }).catch(() => null);

      let isSpecial = false;
      if (choice) {
        isSpecial = choice.customId === `act_spc_${humanId}`;
        await choice.update({
          content: `Vous avez choisi **${isSpecial ? 'attaque spéciale' : 'attaque normale'}**.`,
          components: []
        });
      } else {
        await dm.channel.send('⌛ Temps écoulé, attaque normale par défaut.');
      }

      // 2️⃣ Choix de la cible
      const options = [...session.combatants.entries()]
        .filter(([id, c]) => c.alive && id !== humanId)
        .map(([id, c]) => ({
          label: `${c.name} (${c.hp} HP)`,
          value: id
        }));

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`target_sel_${humanId}`)
        .setPlaceholder('Choisissez votre cible')
        .addOptions(options);

      const selMsg = await dm.channel.send({ components: [ new ActionRowBuilder().addComponents(menu) ] });
      const selected = await selMsg.awaitMessageComponent({
        filter: i => i.user.id === humanId && i.customId === `target_sel_${humanId}`,
        time: 60000
      }).catch(() => null);

      if (selected) {
        const tgtId = selected.values[0];
        const target = session.combatants.get(tgtId);
        if (isSpecial) human.specialAttack(target);
        else            human.attack(target);

        await selected.update({
          content: `Vous avez frappé **${target.name}** (HP→${target.hp}).`,
          components: []
        });
      } else {
        await dm.channel.send('⌛ Temps écoulé, tour sauté.');
      }
    }

    //
    // — B) Tours des bots —
    //
    for (const [id, char] of session.combatants.entries()) {
      if (!char.alive || char.ownerId !== null) continue;
      const choices = [...session.combatants.values()].filter(c => c.alive && c !== char);
      if (choices.length === 0) break;
      const tgt = choices[Math.floor(Math.random() * choices.length)];
      char.attack(tgt);
      await channel.send(`🤖 **${char.name}** attaque **${tgt.name}** (HP→${tgt.hp})`);
    }

    //
    // — C) Annonce des morts —
    //
    for (const [id, c] of session.combatants.entries()) {
      if (!c.alive && !c._deadAnnounced) {
        c._deadAnnounced = true;
        await channel.send(`💀 **${c.name}** est tombé !`);
      }
    }

    //
    // — D) Fin si tous les humains KO —
    //
    const aliveHumans = [...session.combatants.values()].filter(c => c.ownerId && c.alive);
    if (aliveHumans.length === 0) {
      return channel.send('❌ GAME OVER – tous les joueurs sont morts.');
    }

    //
    // — E) Fin si un seul survivant —
    //
    const aliveAll = [...session.combatants.values()].filter(c => c.alive);
    if (aliveAll.length === 1) {
      return channel.send(`🏆 **${aliveAll[0].name}** est le dernier survivant !`);
    }

    session.turn++;
  }

  //
  // — 5) Limite de tours atteinte —
  //
  const alive = [...session.combatants.values()].filter(c => c.alive && c.ownerId);
  const winner = alive.sort((a,b) => b.hp - a.hp)[0];
  return channel.send(`⏱️ Limite atteinte. **${winner.name}** gagne avec ${winner.hp} HP !`);
}


client.login(process.env.DISCORD_TOKEN);
function logMemoryUsage() {
  const used = process.memoryUsage();
  const MB = x => `${(x / 1024 / 1024).toFixed(2)} MB`;

  console.log('📊 [MEMOIRE]');
  console.log(`  RSS       : ${MB(used.rss)}`);
  console.log(`  Heap total: ${MB(used.heapTotal)}`);
  console.log(`  Heap used : ${MB(used.heapUsed)}`);
  console.log(`  External  : ${MB(used.external)}`);
  console.log(`  Array Buff: ${MB(used.arrayBuffers)}`);
  console.log('---------------------------');
}

// Affiche au lancement
logMemoryUsage();

// Répète toutes les 30 secondes
setInterval(logMemoryUsage, 30000);
