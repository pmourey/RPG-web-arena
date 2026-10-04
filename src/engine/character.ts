import {
  ActiveEffect,
  Combatant,
  Condition,
  HeroData,
  InventoryItem,
  MonsterData,
} from '../types/game';
import { getAbilityModifier, getModifiers, getProficiencyBonus, rollDie } from './dice';

export const NEGATIVE_EFFECTS = new Set([
  'sleep',
  'blind',
  'paralyze',
  'frighten',
  'restrained',
  'disadvantage',
]);

export function isDead(character: Combatant): boolean {
  return character.hp <= 0;
}

export function acModifiers(character: Combatant): number {
  let mod = 0;
  const shieldEff = character.effects.find((e) => e.kind === 'shield');
  if (shieldEff) mod += shieldEff.magnitude;
  const foresightEff = character.effects.find((e) => e.kind === 'foresight');
  if (foresightEff) mod += foresightEff.magnitude;
  if (character.effects.some((e) => e.kind === 'blind')) mod -= 2;
  if (character.effects.some((e) => e.kind === 'restrained')) mod -= 2;
  return mod;
}

export function attackModifier(character: Combatant): number {
  let mod = 0;
  if (character.effects.some((e) => e.kind === 'blind')) mod -= 2;
  if (character.effects.some((e) => e.kind === 'frighten')) mod -= 2;
  if (character.effects.some((e) => e.kind === 'disadvantage')) mod -= 2;
  const foresightEff = character.effects.find((e) => e.kind === 'foresight');
  if (foresightEff) mod += foresightEff.magnitude;
  return mod;
}

export function getArmorClass(character: Combatant): number {
  const acMod = acModifiers(character);
  if (!character.is_hero) {
    return (character as MonsterData).base_ac + acMod;
  }
  const hero = character as HeroData;
  const armorBonus = hero.armor?.bonus || 0;
  const shieldBonus = hero.shield?.bonus || 0;
  const dexMod = getAbilityModifier(hero.abilities.dexterity);
  const armorName = (hero.armor?.name || '').toLowerCase();

  let base = 10;
  if (armorName.includes('chainmail') || armorName.includes('plate')) {
    base = 10 + armorBonus + shieldBonus;
  } else if (armorName.includes('hide') || armorName.includes('scale')) {
    base = 10 + armorBonus + Math.min(2, dexMod) + shieldBonus;
  } else {
    base = 10 + armorBonus + dexMod + shieldBonus;
  }

  // Also check worn items with bonus to AC
  for (const item of hero.worn || []) {
    if (item.bonus && (item.type === 'ring' || item.desc?.includes('AC'))) {
      base += item.bonus;
    }
  }

  return base + acMod;
}

export function getAttackBonus(character: Combatant): number {
  const prof = getProficiencyBonus(character.level);
  const atkMod = attackModifier(character);
  if (!character.is_hero) {
    const strMod = getAbilityModifier(character.abilities.strength);
    return strMod + prof + atkMod;
  }
  const hero = character as HeroData;
  let abilityMod = getAbilityModifier(hero.abilities.strength);
  if (hero.class_type === 'Ranger' || hero.class_type === 'Rogue') {
    abilityMod = getAbilityModifier(hero.abilities.dexterity);
  } else if (hero.class_type === 'Wizard') {
    abilityMod = getAbilityModifier(hero.abilities.intelligence);
  }
  return abilityMod + prof + atkMod;
}

export function getDCValue(hero: HeroData): number {
  const prof = Math.floor(hero.level / 4) + 1;
  const mods = getModifiers(hero.abilities);
  const key = (hero.spellcasting_ability || '').toLowerCase() as keyof typeof mods;
  const spellMod = mods[key] || 0;
  return 8 + spellMod + prof;
}

export function savingThrow(character: Combatant, dcType: string, dc: number): boolean {
  const roll = rollDie(20);
  const mods = getModifiers(character.abilities);
  const key = dcType.toLowerCase().slice(0, 3) as keyof typeof mods;
  const mod = mods[key] || 0;
  return roll + mod >= dc;
}

export function syncStatus(character: Combatant): void {
  character.is_blessed = character.effects.some((e) => e.kind === 'bless');
  const conditionOrder: Array<[string, Condition]> = [
    ['sleep', 'unconscious'],
    ['paralyze', 'paralyzed'],
    ['restrained', 'restrained'],
    ['frighten', 'frightened'],
    ['blind', 'blinded'],
  ];

  character.condition = 'ok';
  for (const [kind, cond] of conditionOrder) {
    if (character.effects.some((e) => e.kind === kind)) {
      character.condition = cond;
      return;
    }
  }
}

export function addEffect(character: Combatant, effect: ActiveEffect): void {
  character.effects = character.effects.filter((e) => e.kind !== effect.kind);
  character.effects.push(effect);
  syncStatus(character);
}

export function consumeEffect(character: Combatant, kind: string): ActiveEffect | null {
  const idx = character.effects.findIndex((e) => e.kind === kind);
  if (idx === -1) return null;
  const [effect] = character.effects.splice(idx, 1);
  syncStatus(character);
  return effect;
}

export function cleanseNegative(character: Combatant): string[] {
  const removed: string[] = [];
  character.effects = character.effects.filter((e) => {
    if (NEGATIVE_EFFECTS.has(e.kind)) {
      removed.push(e.kind);
      return false;
    }
    return true;
  });
  if (removed.length > 0) {
    syncStatus(character);
  }
  return removed;
}

export function tickEffects(character: Combatant): string[] {
  const kept: ActiveEffect[] = [];
  const expired: ActiveEffect[] = [];

  for (const eff of character.effects) {
    if (eff.turns === null) {
      kept.push(eff);
      continue;
    }
    if (eff.just_applied) {
      eff.just_applied = false;
      kept.push(eff);
      continue;
    }
    eff.turns -= 1;
    if (eff.turns <= 0) {
      expired.push(eff);
    } else {
      kept.push(eff);
    }
  }

  character.effects = kept;
  if (expired.length > 0) {
    syncStatus(character);
  }

  return expired.map(
    (e) => `[Effect] ${character.name} is no longer affected by ${e.spell_name || e.kind}.`
  );
}

export function receiveDamage(character: Combatant, damage: number): string {
  const amount = Math.max(0, damage);
  if (amount === 0) return '';

  if (
    character.effects.some((e) => e.kind === 'death_ward') &&
    character.hp > 0 &&
    character.hp - amount <= 0
  ) {
    character.hp = 1;
    const ward = consumeEffect(character, 'death_ward');
    const source = ward?.spell_name || 'Death Ward';
    return `${source} keeps ${character.name} at 1 HP!`;
  }

  character.hp -= amount;
  return '';
}

export function getInitiative(character: Combatant): number {
  let roll = rollDie(20) + getAbilityModifier(character.abilities.dexterity);
  if (character.effects.some((e) => e.kind === 'restrained')) {
    roll -= 2;
  }
  return roll;
}

export function equipItem(hero: HeroData, item: InventoryItem): string {
  const itType = item.type;
  if (itType === 'weapon') {
    let sides = 4;
    if (typeof item.damage === 'number') sides = item.damage;
    else if (typeof item.damage === 'string') {
      const match = item.damage.match(/d(\d+)/);
      if (match) sides = parseInt(match[1], 10);
    }
    hero.weapon = {
      name: item.name,
      damage_dice: { num_dice: 1, roll_dice: sides, bonus: 0 },
    };
    return `${hero.name} équipe ${item.name}.`;
  }
  if (itType === 'armor') {
    const bonus = Number(item.bonus || item.ac || 0);
    hero.armor = { name: item.name, bonus };
    return `${hero.name} équipe ${item.name}.`;
  }
  if (itType === 'shield') {
    const bonus = Number(item.bonus || 0);
    hero.shield = { name: item.name, bonus };
    return `${hero.name} équipe ${item.name}.`;
  }
  if (itType === 'ring' || itType === 'wondrous') {
    if (hero.worn.some((w) => w.name === item.name)) {
      return `${hero.name} porte déjà ${item.name}.`;
    }
    hero.worn.push({ ...item });
    return `${hero.name} porte maintenant ${item.name}.`;
  }
  return `${item.name} ne peut pas être équipé.`;
}

export function unequipWeapon(hero: HeroData): string {
  const old = hero.weapon;
  if (!old || old.name === 'Fists') {
    return `${hero.name} ne porte aucune arme à retirer.`;
  }
  hero.weapon = { name: 'Fists', damage_dice: { num_dice: 1, roll_dice: 4, bonus: 0 } };
  return `${hero.name} range ${old.name}.`;
}

export function unequipArmor(hero: HeroData): string {
  const old = hero.armor;
  if (!old || old.name === 'Cloth' || old.name === 'None') {
    return `${hero.name} ne porte aucune armure à retirer.`;
  }
  hero.armor = { name: 'Cloth', bonus: 0 };
  return `${hero.name} retire ${old.name}.`;
}

export function unequipShield(hero: HeroData): string {
  const old = hero.shield;
  if (!old || old.name === 'None') {
    return `${hero.name} ne porte aucun bouclier à retirer.`;
  }
  hero.shield = { name: 'None', bonus: 0 };
  return `${hero.name} range ${old.name}.`;
}

export function unequipWorn(hero: HeroData, name: string): string {
  const idx = hero.worn.findIndex((w) => w.name === name);
  if (idx === -1) {
    return `${hero.name} ne porte pas ${name}.`;
  }
  hero.worn.splice(idx, 1);
  return `${hero.name} arrête de porter ${name}.`;
}

export function isItemEquipped(hero: HeroData, item: InventoryItem): boolean {
  if (item.type === 'weapon') return hero.weapon?.name === item.name;
  if (item.type === 'armor') return hero.armor?.name === item.name;
  if (item.type === 'shield') return hero.shield?.name === item.name;
  if (item.type === 'ring' || item.type === 'wondrous') {
    return hero.worn.some((w) => w.name === item.name);
  }
  return false;
}

export function removeFromInventory(hero: HeroData, item: InventoryItem): string {
  const idx = hero.inventory.findIndex((it) => it === item || (it.name === item.name && it.type === item.type));
  if (idx === -1) {
    return `Objet introuvable dans l'inventaire de ${hero.name}.`;
  }
  const [removed] = hero.inventory.splice(idx, 1);
  let msg = `${removed.name} supprimé de l'inventaire de ${hero.name}.`;

  if (isItemEquipped(hero, removed)) {
    if (removed.type === 'weapon') unequipWeapon(hero);
    if (removed.type === 'armor') unequipArmor(hero);
    if (removed.type === 'shield') unequipShield(hero);
    if (removed.type === 'ring' || removed.type === 'wondrous') unequipWorn(hero, removed.name);
    msg += ' (déséquipé)';
  }
  return msg;
}

export function useItem(hero: HeroData, item: InventoryItem): string {
  if (item.type !== 'potion' && item.type !== 'consumable') {
    return `${item.name} n'est pas consommable.`;
  }

  // Healing
  if (item.heal) {
    const amount = Number(item.heal);
    const old = hero.hp;
    hero.hp = Math.min(hero.max_hp, hero.hp + amount);
    return `${hero.name} utilise ${item.name} et récupère ${hero.hp - old} PV.`;
  }

  // Dice parse in desc like 2d4+2
  const desc = item.desc || item.description || '';
  const match = desc.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
  if (match) {
    const n = parseInt(match[1], 10);
    const d = parseInt(match[2], 10);
    const b = parseInt(match[3] || '0', 10);
    let healed = b;
    for (let i = 0; i < n; i++) healed += rollDie(d);
    const old = hero.hp;
    hero.hp = Math.min(hero.max_hp, hero.hp + healed);
    return `${hero.name} utilise ${item.name} et récupère ${hero.hp - old} PV (${healed} jet).`;
  }

  if (item.cure) {
    const removed = cleanseNegative(hero);
    if (removed.length > 0) {
      return `${hero.name} boit ${item.name} et est guéri: ${removed.join(', ')}`;
    }
    return `${hero.name} boit ${item.name} mais rien à guérir.`;
  }

  if (item.buff) {
    const b = item.buff;
    const eff: ActiveEffect = {
      kind: b.kind || 'buff',
      magnitude: Number(b.magnitude || 1),
      turns: Number(b.turns || 1),
      spell_name: item.name,
      just_applied: true,
    };
    addEffect(hero, eff);
    return `${hero.name} utilise ${item.name} et gagne ${eff.kind} (+${eff.magnitude}) pour ${eff.turns} tours.`;
  }

  return `${item.name} n'a aucun effet implémenté.`;
}
