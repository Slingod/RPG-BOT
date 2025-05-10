export class Character {
  constructor(name, hp, dmg, mana = 0) {
    this.name = name;
    this.hp = hp;
    this.dmg = dmg;
    this.mana = mana;
    this.alive = true;
    this.isProtected = false;  // pour Assassin
  }

  attack(target) {
    if (!this.alive || !target.alive) return;
    target.takeDamage(this.dmg);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    if (this.isProtected) {
      this.isProtected = false;
      return;
    }
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }
}