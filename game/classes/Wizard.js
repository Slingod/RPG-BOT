import { Character } from './Character.js';

export class Wizard extends Character {
  constructor(name) {
    super(name, 10, 2, 200);
  }

  specialAttack(target) {
    if (this.mana < 25) return;
    this.mana -= 25;
    // Fireball : 7 dmg
    target.takeDamage(7);
  }
}