import { AbilitiesData, DamageDiceData } from '../types/game';

export function rollDie(sides: number): number {
  if (sides <= 0) return 0;
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(numDice: number, rollDiceSides: number, bonus = 0): number {
  let total = bonus;
  for (let i = 0; i < numDice; i++) {
    total += rollDie(rollDiceSides);
  }
  return total;
}

export function rollDamageDice(dice: DamageDiceData | null | undefined): number {
  if (!dice) return 0;
  return rollDice(dice.num_dice, dice.roll_dice, dice.bonus || 0);
}

export function formatDamageDice(dice: DamageDiceData | null | undefined): string {
  if (!dice) return '0';
  const bonus = dice.bonus ? (dice.bonus > 0 ? `+${dice.bonus}` : `${dice.bonus}`) : '';
  return `${dice.num_dice}d${dice.roll_dice}${bonus}`;
}

export function parseDiceString(diceStr: string): number {
  const match = String(diceStr).match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
  if (!match) return 4.0;
  const num = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const bonus = parseInt(match[3] || '0', 10);
  return num * ((sides + 1) / 2) + bonus;
}

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function getProficiencyBonus(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

export function getModifiers(abilities: AbilitiesData) {
  return {
    str: getAbilityModifier(abilities.strength),
    int: getAbilityModifier(abilities.intelligence),
    dex: getAbilityModifier(abilities.dexterity),
    wis: getAbilityModifier(abilities.wisdom),
    con: getAbilityModifier(abilities.constitution),
    cha: getAbilityModifier(abilities.charisma),
  };
}
