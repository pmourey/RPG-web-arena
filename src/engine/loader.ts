import armorsJson from '../data/armors.json';
import classesJson from '../data/classes.json';
import heroesJson from '../data/heroes.json';
import magicConfigJson from '../data/magic_config.json';
import magicItemsJson from '../data/magic_items.json';
import monstersJson from '../data/monsters.json';
import racesJson from '../data/races.json';
import shieldsJson from '../data/shields.json';
import spellCategoriesJson from '../data/spell_categories.json';
import spellsJson from '../data/spells.json';
import weaponsJson from '../data/weapons.json';
import {
  AbilitiesData,
  ArmorItem,
  DamageDiceData,
  HeroData,
  InventoryItem,
  MonsterData,
  MonsterTypeData,
  ShieldItem,
  SpellData,
  WeaponItem,
} from '../types/game';
import { equipItem } from './character';
import { getAbilityModifier, rollDamageDice, rollDie } from './dice';

const MELEE_CLASSES = new Set(['Fighter', 'Paladin', 'Ranger', 'Rogue']);

export function loadAllSpells(): SpellData[] {
  const result: SpellData[] = [];
  for (const group of spellsJson as any[]) {
    const classType = group.class;
    for (const s of group.spells) {
      let dd: DamageDiceData | null = null;
      if (s.damage_dice && typeof s.damage_dice.num_dice === 'number' && typeof s.damage_dice.roll_dice === 'number') {
        dd = {
          num_dice: s.damage_dice.num_dice,
          roll_dice: s.damage_dice.roll_dice,
          bonus: s.damage_dice.bonus || 0,
        };
      }
      result.push({
        name: s.name,
        class_type: classType,
        level: s.level,
        damage_dice: dd,
        effect: s.effect || '',
        dc_type: s.dc?.dc_type || '',
        dc_success: s.dc?.dc_success || '',
        description: s.description || '',
        multi_target: s.multi_target || false,
      });
    }
  }
  return result;
}

export function loadAllMonsterTypes(): MonsterTypeData[] {
  return (monstersJson as any[]).map((m) => ({
    name: m.name,
    hit_dice: {
      num_dice: m.hit_dice.num_dice,
      roll_dice: m.hit_dice.roll_dice,
      bonus: m.hit_dice.bonus || 0,
    },
    ac: m.ac,
    damage_dice: {
      num_dice: m.damage_dice.num_dice,
      roll_dice: m.damage_dice.roll_dice,
      bonus: m.damage_dice.bonus || 0,
    },
    spellcasting: m.spellcasting || false,
    resistances: m.resistances || [],
    immunities: m.immunities || [],
    vulnerabilities: m.vulnerabilities || [],
  }));
}

export function getLoadedGameData() {
  return {
    monsters: loadAllMonsterTypes(),
    spells: loadAllSpells(),
    classes: classesJson,
    races: racesJson,
    weapons: weaponsJson,
    armors: armorsJson,
    shields: shieldsJson,
    heroesData: heroesJson,
    spellCategories: spellCategoriesJson,
    magicItems: magicItemsJson as InventoryItem[],
    magicConfig: magicConfigJson,
  };
}

export function levelUpHero(char: HeroData, allSpells: SpellData[]): void {
  char.level += 1;
  const conMod = getAbilityModifier(char.abilities.constitution);
  const hpGained = rollDie(char.hit_dice || 8) + Math.max(0, conMod);
  const addHp = Math.max(1, hpGained);
  char.max_hp += addHp;
  char.hp += addHp;

  const maxSpellLevel = Math.max(1, Math.floor(Math.min(20, char.level + 1) / 2));
  for (let i = 0; i < Math.min(maxSpellLevel, char.max_spell_slots.length); i++) {
    char.max_spell_slots[i] = Math.min(char.max_spell_slots[i] + rollDie(3), 9);
    char.current_spell_slots[i] = char.max_spell_slots[i];
  }

  if (['Fighter', 'Ranger', 'Paladin'].includes(char.class_type)) {
    let extra = 0;
    if (char.level >= 5) extra += 1;
    if (char.class_type === 'Fighter') {
      if (char.level >= 11) extra += 1;
      if (char.level >= 20) extra += 1;
    }
    char.multi_attack = 1 + extra;
  }

  // Learn new spells if applicable
  const newSpells = allSpells.filter(
    (s) =>
      s.class_type === char.class_type &&
      !char.spells.some((cs) => cs.name === s.name) &&
      s.level <= maxSpellLevel
  );
  if (newSpells.length > 0) {
    let countToLearn = 0;
    if (char.class_type === 'Wizard') countToLearn = Math.min(2, newSpells.length);
    else if (['Sorcerer', 'Bard', 'Ranger', 'Cleric', 'Druid'].includes(char.class_type)) {
      countToLearn = Math.min(1, newSpells.length);
    }
    // Pick random subset
    const shuffled = [...newSpells].sort(() => 0.5 - Math.random());
    char.spells.push(...shuffled.slice(0, countToLearn));
  }
}

export function buildPartyFromHeroes(
  heroesSource = heroesJson,
  partySize = 6,
  partyLevel = 1
): HeroData[] {
  const allSpells = loadAllSpells();
  const melee = (heroesSource as any[]).filter((h) => MELEE_CLASSES.has(h.class));
  const casters = (heroesSource as any[]).filter((h) => !MELEE_CLASSES.has(h.class));

  const frontNeeded = Math.min(3, partySize);
  const backNeeded = Math.min(partySize - frontNeeded, partySize);

  const frontSelection = [...melee].sort(() => 0.5 - Math.random()).slice(0, frontNeeded);
  const backSelection = [...casters].sort(() => 0.5 - Math.random()).slice(0, backNeeded);
  const selection = [...frontSelection, ...backSelection];

  const remaining = (heroesSource as any[]).filter((h) => !selection.includes(h));
  while (selection.length < partySize && remaining.length > 0) {
    selection.push(remaining.pop()!);
  }

  const party: HeroData[] = selection.map((h, idx) => {
    const classStr = h.class || 'Fighter';
    const raceName = h.race || 'Human';
    const ab = h.abilities || {};
    const abilities: AbilitiesData = {
      strength: ab.strength || 10,
      intelligence: ab.intelligence || 10,
      dexterity: ab.dexterity || 10,
      wisdom: ab.wisdom || 10,
      constitution: ab.constitution || 10,
      charisma: ab.charisma || 10,
    };

    const weaponInfo = (weaponsJson as any[]).find((w) => w.name === h.weapon) || { damage: 4 };
    const armorInfo = (armorsJson as any[]).find((a) => a.name === h.armor) || { bonus: 0 };
    const shieldInfo = (shieldsJson as any[]).find((s) => s.name === h.shield) || { bonus: 0 };
    const classInfo = (classesJson as any[]).find((c) => c.name.toLowerCase() === classStr.toLowerCase()) || {};

    const weapon: WeaponItem = {
      name: h.weapon || 'Fists',
      damage_dice: { num_dice: 1, roll_dice: weaponInfo.damage || 4, bonus: 0 },
    };
    const armor: ArmorItem = {
      name: h.armor || 'Cloth',
      bonus: armorInfo.bonus || 0,
    };
    const shield: ShieldItem = {
      name: h.shield || 'None',
      bonus: shieldInfo.bonus || 0,
    };

    const spellcastingAbility = classInfo.spellcasting_ability || '';
    const hitDice = classInfo.hit_dice || 8;
    const isFront = idx < frontNeeded;

    const inventory: InventoryItem[] = [];
    if (weapon.name && weapon.name !== 'Fists') {
      inventory.push({ name: weapon.name, type: 'weapon', damage: weapon.damage_dice.roll_dice });
    }
    if (armor.name && armor.name !== 'Cloth' && armor.name !== 'None') {
      inventory.push({ name: armor.name, type: 'armor', bonus: armor.bonus });
    }
    if (shield.name && shield.name !== 'None') {
      inventory.push({ name: shield.name, type: 'shield', bonus: shield.bonus });
    }

    let multiAttack = 1;
    if (['Fighter', 'Ranger', 'Paladin'].includes(classStr)) {
      if (h.level >= 20) multiAttack = 4;
      else if (h.level >= 11) multiAttack = 3;
      else if (h.level >= 5) multiAttack = 2;
    }

    const hero: HeroData = {
      id: h.id || idx + 1,
      name: h.name || 'Hero',
      level: h.level || 1,
      hp: h.hp || 10,
      max_hp: h.max_hp || 10,
      gold: h.gold || 0,
      xp: h.xp || 0,
      condition: 'ok',
      is_blessed: false,
      abilities,
      effects: [],
      inventory,
      worn: [],
      is_hero: true,
      class_type: classStr,
      race: raceName,
      armor,
      weapon,
      shield,
      spellcasting_ability: spellcastingAbility,
      spells: [],
      max_spell_slots: new Array(10).fill(0),
      current_spell_slots: new Array(10).fill(0),
      hit_dice: hitDice,
      multi_attack: multiAttack,
      position: isFront ? 'front' : 'back',
    };

    if (spellcastingAbility) {
      const allowed = allSpells.filter(
        (s) => s.class_type === classStr && s.level <= Math.max(1, Math.floor(partyLevel / 2))
      );
      // Give 1-2 starting spells
      const picked = [...allowed].sort(() => 0.5 - Math.random()).slice(0, Math.min(2, allowed.length));
      hero.spells = picked;
      const baseSlots = classInfo.base_spell_slots || 1;
      hero.max_spell_slots[0] = baseSlots;
      hero.current_spell_slots[0] = baseSlots;
    }

    // Level up hero to partyLevel
    for (let lvl = 1; lvl < partyLevel; lvl++) {
      levelUpHero(hero, allSpells);
    }

    return hero;
  });

  return party;
}

export function createSampleMonsters(
  availableTypes = loadAllMonsterTypes(),
  count = 3
): MonsterData[] {
  if (!availableTypes || availableTypes.length === 0) return [];
  const monsters: MonsterData[] = [];

  for (let i = 0; i < count; i++) {
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const hp = rollDamageDice(type.hit_dice);
    const level = type.hit_dice.num_dice;
    const abilities: AbilitiesData = {
      strength: 8 + level,
      intelligence: 8,
      dexterity: 10 + level,
      wisdom: 10,
      charisma: 10,
      constitution: 10 + level,
    };

    monsters.push({
      id: i + 1,
      name: type.name,
      level,
      hp: Math.max(1, hp),
      max_hp: Math.max(1, hp),
      gold: rollDie(10),
      xp: (rollDie(11) + 4) * (level + 1),
      condition: 'ok',
      is_blessed: false,
      abilities,
      effects: [],
      inventory: [],
      is_hero: false,
      monster_type: type,
      base_ac: type.ac,
      damage_dice: type.damage_dice,
    });
  }

  return monsters;
}
