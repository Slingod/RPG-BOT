import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// On ne déploie que startgame.js
const commands = [];
const cmdPath = path.join(__dirname, 'commands', 'startgame.js');
const { data } = await import(`file://${cmdPath}`);
commands.push(data.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log('⏳ Déploiement des commandes slash…');
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log('✅ Commandes enregistrées avec succès.');
} catch (error) {
  console.error('❌ Erreur lors du déploiement :', error);
}
