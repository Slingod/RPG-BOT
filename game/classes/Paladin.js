import { Character } from './Character.js';

export class Paladin extends Character {
  constructor(name) {
    super(name, 16, 3, 160);
  }

  specialAttack(target) {
    if (this.mana < 40) return;
    this.mana -= 40;
    // Healing Lighting : 4 dmg + heal 5
    target.takeDamage(4);
    this.hp += 5;
  }
}