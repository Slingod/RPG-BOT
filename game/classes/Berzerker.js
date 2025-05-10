import { Character } from './Character.js';

export class Berzerker extends Character {
  constructor(name) {
    super(name, 8, 4, 0);
  }

  specialAttack() {
    // Rage : +1 dmg permanent, -1 hp
    this.dmg += 1;
    this.hp -= 1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }
}