import { Character } from './Character.js';

export class Monk extends Character {
  constructor(name) {
    super(name, 8, 2, 200);
  }

  specialAttack(target) {
    if (this.mana < 25) return;
    this.mana -= 25;
    // Heal : +8 hp
    this.hp += 8;
  }
}