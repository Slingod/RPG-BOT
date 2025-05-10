import {
  Fighter,
  Paladin,
  Monk,
  Berzerker,
  Assassin,
  Ranger,
  Wizard
} from './classes/index.js';

export class Engine {
  constructor(playerEntries, expectedPlayers) {
    // on attend que chaque entry soit { userId, gameCharInstance }
    this.combatants = playerEntries.map(e => e.gameCharInstance);
    // si besoin, ajouter des bots ici
    this.currentTurn = 1;
    this.maxTurns    = 10;
  }

  playTurn(userId, actionType, targetIdx) {
    const logs = [];
    const me = this.combatants.find(c => c.ownerId === userId);

    // 1) Mon action
    if (actionType === 'attack') {
      const tgt = this.combatants.filter(c=>c.alive && c.ownerId!==userId)[targetIdx];
      logs.push(`${me.name} attaque ${tgt.name}.`);
      me.attack(tgt);
    } else if (actionType === 'special') {
      if (me instanceof Ranger) {
        const ennemis = this.combatants.filter(c=>c.alive && c!==me);
        logs.push(`${me.name} utilise Rain of Arrows !`);
        me.specialAttack(ennemis);
      } else {
        const tgt = this.combatants.filter(c=>c.alive && c.ownerId!==userId)[targetIdx];
        logs.push(`${me.name} utilise son attaque spéciale !`);
        me.specialAttack(tgt);
      }
    }

    // 2) Bots
    for (const bot of this.combatants.filter(c=>c.alive && c.ownerId===null)) {
      const possibles = this.combatants.filter(c=>c.alive && c!==bot);
      const choice    = possibles[Math.floor(Math.random()*possibles.length)];
      if (bot instanceof Ranger) {
        logs.push(`${bot.name} utilise Rain of Arrows !`);
        bot.specialAttack(possibles);
      } else if (Math.random()<0.5) {
        logs.push(`${bot.name} attaque ${choice.name}.`);
        bot.attack(choice);
      } else {
        logs.push(`${bot.name} utilise son attaque spéciale !`);
        bot.specialAttack(choice);
      }
    }

    // 3) Vérif fin de partie
    let gameOver = false, winner = null;
    const alive = this.combatants.filter(c=>c.alive);

    if (!me.alive) {
      gameOver = true; winner = 'Ordinateur';
      logs.push(`💀 ${me.name} est KO !`);
    } else if (alive.length === 1) {
      gameOver = true; winner = alive[0].name;
      logs.push(`🏆 ${winner} est le dernier survivant !`);
    } else if (this.currentTurn >= this.maxTurns) {
      const champ = alive.reduce((a,b)=> a.hp>=b.hp?a:b);
      gameOver = true; winner = champ.name;
      logs.push(`⏱️ Limite atteinte. ${champ.name} gagne avec ${champ.hp} HP !`);
    }

    this.currentTurn++;
    return { logs, gameOver, winner };
  }
}