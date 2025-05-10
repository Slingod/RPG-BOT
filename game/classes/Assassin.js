import { Character } from './Character.js';

export class Assassin extends Character {
  constructor(name) {
    super(name, 6, 6, 20);
  }

  specialAttack(target) {
    if (this.mana < 20) return;
    this.mana -= 20;
    // Shadow Hit : 7 dmg + invul next turn
    target.takeDamage(7);
    this.isProtected = true;
  }
}