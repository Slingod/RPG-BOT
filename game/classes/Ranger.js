import { Character } from './Character.js';

export class Ranger extends Character {
  constructor(name) {
    super(name, 10, 3, 60);
  }

  specialAttack(targets) {
    // Rain of Arrows : 3 dmg to each target, costs 30 mana
    if (this.mana < 30) return;
    this.mana -= 30;
    targets.forEach(t => t.takeDamage(3));
  }
}