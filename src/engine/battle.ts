import armorsJson from '../data/armors.json';
import magicConfigJson from '../data/magic_config.json';
import magicItemsJson from '../data/magic_items.json';
import shieldsJson from '../data/shields.json';
import weaponsJson from '../data/weapons.json';
import {
  ActiveEffect,
  Combatant,
  HeroData,
  InitiativeEntry,
  InventoryItem,
  MonsterData,
  SpellData,
} from '../types/game';
import {
  consumeEffect,
  equipItem,
  getArmorClass,
  getAttackBonus,
  getInitiative,
  isDead,
  receiveDamage,
} from './character';
import { getAbilityModifier, rollDamageDice, rollDie } from './dice';
import { isBeneficial, resolveSpellEffect } from './effects';

export function calculateInitiative(party: HeroData[], monsters: MonsterData[]): InitiativeEntry[] {
  const aliveHeroes = party.filter((h) => !isDead(h));
  const aliveMonsters = monsters.filter((m) => !isDead(m));

  const list: InitiativeEntry[] = [];

  for (const h of aliveHeroes) {
    const dexMod = getAbilityModifier(h.abilities.dexterity);
    const d20 = rollDie(20);
    const penalty = h.effects.some((e) => e.kind === 'restrained') ? 2 : 0;
    const initiative = d20 + dexMod - penalty;
    list.push({ combatant: h, initiative, roll: d20, dexMod });
  }

  for (const m of aliveMonsters) {
    const dexMod = getAbilityModifier(m.abilities.dexterity);
    const d20 = rollDie(20);
    const penalty = m.effects.some((e) => e.kind === 'restrained') ? 2 : 0;
    const initiative = d20 + dexMod - penalty;
    list.push({ combatant: m, initiative, roll: d20, dexMod });
  }

  // D&D 5e Sorting:
  // 1. Highest total initiative
  // 2. Tie-break: highest Dexterity modifier
  // 3. Fair coin-flip / random tie break (never bias towards heroes)
  list.sort((a, b) => {
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }
    const bDex = b.dexMod ?? getAbilityModifier(b.combatant.abilities.dexterity);
    const aDex = a.dexMod ?? getAbilityModifier(a.combatant.abilities.dexterity);
    if (bDex !== aDex) {
      return bDex - aDex;
    }
    return Math.random() - 0.5;
  });

  return list;
}

export function calculateHitChance(attacker: Combatant, defender: Combatant): number {
  if (['unconscious', 'paralyzed'].includes(defender.condition)) {
    return 1.0;
  }
  const neededRoll = getArmorClass(defender) - getAttackBonus(attacker);
  if (neededRoll <= 1) return 19 / 20;
  if (neededRoll >= 20) return 1 / 20;
  const faces = 20 - neededRoll + 1;
  return faces / 20;
}

export function rollBaseWeaponDamage(attacker: Combatant): number {
  if (!attacker.is_hero) {
    const m = attacker as MonsterData;
    const base = rollDamageDice(m.damage_dice);
    const strMod = Math.floor((m.abilities.strength - 10) / 2);
    return Math.max(1, base + strMod);
  }
  const h = attacker as HeroData;
  const base = rollDamageDice(h.weapon.damage_dice);
  let abilityMod = Math.floor((h.abilities.strength - 10) / 2);
  if (h.class_type === 'Ranger' || h.class_type === 'Rogue') {
    abilityMod = Math.floor((h.abilities.dexterity - 10) / 2);
  } else if (h.class_type === 'Wizard') {
    abilityMod = Math.floor((h.abilities.intelligence - 10) / 2);
  }
  return Math.max(1, base + abilityMod);
}

export function rollDamageWithModifiers(
  attacker: Combatant,
  defender: Combatant,
  isCritical: boolean,
  logFn: (msg: string) => void
): number {
  let baseDamage = rollBaseWeaponDamage(attacker);

  // Time stop effect consumption
  if (attacker.effects.some((e) => e.kind === 'time_stop')) {
    consumeEffect(attacker, 'time_stop');
  }

  // Bless bonus
  if (attacker.is_blessed) {
    const d4 = rollDie(4);
    baseDamage += d4;
    logFn(`✨ Bless s'applique ! +${d4} aux dégâts.`);
  }

  // Smite effect
  const smite = consumeEffect(attacker, 'smite');
  if (smite) {
    baseDamage += smite.magnitude;
    logFn(`⚡ Smite libéré ! +${smite.magnitude} aux dégâts.`);
    if (smite.extra === 'blind') {
      defender.effects.push({
        kind: 'blind',
        turns: 1,
        magnitude: 0,
        spell_name: smite.spell_name,
        just_applied: true,
      });
      logFn(`👁️ ${defender.name} est aveuglé par le châtiment !`);
    }
  }

  if (isCritical) {
    baseDamage *= 2;
  }

  return Math.max(1, baseDamage);
}

export function meleeAttack(
  attacker: Combatant,
  defenders: Combatant[],
  logFn: (msg: string) => void
): void {
  for (const defender of defenders) {
    if (isDead(defender)) continue;

    if (['unconscious', 'paralyzed'].includes(defender.condition)) {
      const damage = rollDamageWithModifiers(attacker, defender, true, logFn);
      const note = receiveDamage(defender, damage);
      logFn(
        `🎯 ${attacker.name} touche AUTOMATIQUEMENT ${defender.name} (sans défense) pour un COUP CRITIQUE de ${damage} dégâts ! ${note}`.trim()
      );
      continue;
    }

    const d20 = rollDie(20);
    const attackBonus = getAttackBonus(attacker);
    const totalAttack = d20 + attackBonus;
    const ac = getArmorClass(defender);

    if (d20 === 1) {
      const fumbleDamage = rollDie(4);
      receiveDamage(attacker, fumbleDamage);
      const actions = [
        'glisse lamentablement en attaquant et s’entaille la jambe',
        'frappe un mur de pierre par maladresse',
        'perd l’équilibre et se cogne la tête',
      ];
      const action = actions[Math.floor(Math.random() * actions.length)];
      let msg = `❌ ÉCHEC CRITIQUE ! ${attacker.name} fait un 1 naturel... Il ${action} ! Il subit ${fumbleDamage} dégâts.`;
      if (isDead(attacker)) msg += ` ${attacker.name} s'est tué !`;
      logFn(msg);
    } else if (d20 === 20) {
      const damage = rollDamageWithModifiers(attacker, defender, true, logFn);
      const note = receiveDamage(defender, damage);
      logFn(`🎯 COUP CRITIQUE ! ${attacker.name} fait un 20 naturel et inflige ${damage} dégâts à ${defender.name} ! ${note}`.trim());
    } else if (totalAttack >= ac) {
      const damage = rollDamageWithModifiers(attacker, defender, false, logFn);
      const note = receiveDamage(defender, damage);
      logFn(
        `🗡️ ${attacker.name} (jet: ${d20} + ${attackBonus} = ${totalAttack}) TOUCHE ${defender.name} (CA: ${ac}) pour ${damage} dégâts ! ${note}`.trim()
      );
    } else {
      logFn(`🛡️ ${attacker.name} (jet: ${d20} + ${attackBonus} = ${totalAttack}) RATE ${defender.name} (CA: ${ac}) !`);
    }
  }
}

export function parseBonusFromItem(item: InventoryItem): number {
  if (typeof item.bonus === 'number') return item.bonus;
  if (typeof item.ac === 'number') return item.ac;
  const match = (item.desc || item.name || '').match(/\+\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function weaponPower(w: any): number {
  if (!w) return 4.0;
  if (typeof w.damage === 'number') return w.damage;
  if (typeof w.damage === 'string') {
    const match = w.damage.match(/(\d+)d(\d+)/);
    if (match) return parseInt(match[1], 10) * ((parseInt(match[2], 10) + 1) / 2);
  }
  return 4.0;
}

export function tryAutoEquip(hero: HeroData, item: InventoryItem, logFn: (msg: string) => void): void {
  const itType = item.type;
  const name = item.name || 'Objet';

  if (itType === 'weapon') {
    const curPower = weaponPower({ damage: hero.weapon?.damage_dice?.roll_dice || 4 });
    const newPower = weaponPower(item);
    if (newPower > curPower) {
      equipItem(hero, item);
      logFn(`⚔️ ${hero.name} équipe automatiquement ${name} (Arme).`);
    }
  } else if (itType === 'armor') {
    const curBonus = hero.armor?.bonus || 0;
    const newBonus = parseBonusFromItem(item);
    if (newBonus > curBonus) {
      equipItem(hero, item);
      logFn(`🛡️ ${hero.name} équipe automatiquement ${name} (Armure).`);
    }
  } else if (itType === 'shield') {
    const curBonus = hero.shield?.bonus || 0;
    const newBonus = parseBonusFromItem(item);
    if (newBonus > curBonus) {
      equipItem(hero, item);
      logFn(`🛡️ ${hero.name} équipe automatiquement ${name} (Bouclier).`);
    }
  }
}

export function distributeLoot(
  defeatedMonsters: MonsterData[],
  survivors: HeroData[],
  logFn: (msg: string) => void
): void {
  if (!survivors || survivors.length === 0) return;

  const config = magicConfigJson || {
    rarity_chances: {
      Legendary: 0.005,
      'Very rare': 0.01,
      Rare: 0.03,
      Uncommon: 0.08,
      Common: 0.15,
    },
    per_level_scale: 0.02,
  };

  const rarityChances = config.rarity_chances as Record<string, number>;
  const perLevelScale = Number(config.per_level_scale || 0.02);

  for (const m of defeatedMonsters) {
    // 1. Non-magical equipment drop (25% chance)
    if (Math.random() < 0.25) {
      const typeIdx = Math.floor(Math.random() * 3);
      let item: InventoryItem | null = null;
      if (typeIdx === 0 && weaponsJson.length > 0) {
        const randW = weaponsJson[Math.floor(Math.random() * weaponsJson.length)];
        item = { name: randW.name, type: 'weapon', damage: randW.damage };
      } else if (typeIdx === 1 && armorsJson.length > 0) {
        const randA = armorsJson[Math.floor(Math.random() * armorsJson.length)];
        item = { name: randA.name, type: 'armor', bonus: randA.bonus };
      } else if (shieldsJson.length > 0) {
        const randS = shieldsJson[Math.floor(Math.random() * shieldsJson.length)];
        item = { name: randS.name, type: 'shield', bonus: randS.bonus };
      }

      if (item && item.name) {
        const owner = survivors[Math.floor(Math.random() * survivors.length)];
        owner.inventory.push(item);
        logFn(`📦 ${owner.name} trouve ${item.name} sur ${m.name} !`);
        tryAutoEquip(owner, item, logFn);
      }
    }

    // 2. Magic item drop
    const r = Math.random();
    let cumulative = 0.0;
    for (const [rarity, chance] of Object.entries(rarityChances)) {
      cumulative += chance * (1 + (m.level || 1) * perLevelScale);
      if (r < cumulative) {
        const candidates = (magicItemsJson as InventoryItem[]).filter((it) => it.rarity === rarity);
        if (candidates.length > 0) {
          const mi = { ...candidates[Math.floor(Math.random() * candidates.length)] };
          const owner = survivors[Math.floor(Math.random() * survivors.length)];
          owner.inventory.push(mi);
          logFn(`✨ ${owner.name} trouve un objet magique : ${mi.name} (${rarity}) sur ${m.name} !`);
          tryAutoEquip(owner, mi, logFn);
        }
        break;
      }
    }
  }
}
