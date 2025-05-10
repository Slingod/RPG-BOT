import { Character } from './Character.js';

export class Fighter extends Character {
  constructor(name) {
    super(name, 12, 4, 40);
  }

  specialAttack(target) {
    if (this.mana < 20) return;
    this.mana -= 20;
    // Dark Vision : 5 dmg
    target.takeDamage(5);
  }
}
