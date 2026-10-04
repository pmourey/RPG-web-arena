import {
  Combatant,
  HeroData,
  MonsterData,
  SpellData,
} from '../types/game';
import {
  isDead,
  receiveDamage,
  tickEffects,
} from './character';
import {
  distributeLoot,
  meleeAttack,
  rollDamageWithModifiers,
} from './battle';
import { isBeneficial, resolveSpellEffect } from './effects';
import {
  buildPartyFromHeroes,
  createSampleMonsters,
  levelUpHero,
  loadAllMonsterTypes,
  loadAllSpells,
} from './loader';
import { rollDie } from './dice';

export interface BatchSimulationResult {
  numCombats: number;
  victories: number;
  defeatedMonstersCount: number;
  totalSpellsCast: number;
  party: HeroData[];
  killedByLevel: Record<string, number>[];
  spellsCastByLevel: Record<string, number>[];
  logSamples: string[];
}

export function runBatchSimulation(params: {
  maxCombats?: number;
  partySize?: number;
  maxMonsters?: number;
  restFreq?: number;
  partyLevel?: number;
}): BatchSimulationResult {
  const maxCombats = params.maxCombats ?? 50;
  const partySize = params.partySize ?? 6;
  const maxMonsters = params.maxMonsters ?? 2;
  const restFreq = params.restFreq ?? 20;
  const initialPartyLevel = params.partyLevel ?? 1;

  const allMonsterTypes = loadAllMonsterTypes();
  const allSpells = loadAllSpells();

  const party = buildPartyFromHeroes(undefined, partySize, initialPartyLevel);

  const killedByLevel: Record<string, number>[] = Array.from({ length: 20 }, () => ({}));
  const spellsCastByLevel: Record<string, number>[] = Array.from({ length: 9 }, () => ({}));
  let totalSpellsCast = 0;
  let victories = 0;
  let defeatedMonstersCount = 0;
  const logs: string[] = [];

  const addLog = (msg: string) => {
    if (logs.length < 500) logs.push(msg);
  };

  addLog(`--- DÉBUT DE LA SIMULATION BATCH (${maxCombats} combats max, repos tous les ${restFreq}) ---`);

  for (let numCombats = 1; numCombats <= maxCombats; numCombats++) {
    // Check level-up
    for (const hero of party) {
      if (Math.floor(hero.xp / 500) >= hero.level && hero.level < 20) {
        levelUpHero(hero, allSpells);
        addLog(`🌟 ${hero.name} monte au niveau ${hero.level} !`);
      }
    }

    // Rest check
    if (numCombats % restFreq === 0) {
      for (const hero of party) {
        hero.hp = hero.max_hp;
        hero.effects = [];
        hero.current_spell_slots = [...hero.max_spell_slots];
      }
      addLog(`🏕️ Combat #${numCombats} : Le groupe se repose à l'auberge. PV et sorts restaurés !`);
    }

    // If all heroes are dead, abort simulation
    if (party.every((h) => isDead(h))) {
      addLog(`💀 Combat #${numCombats} : Tout le groupe a péri. Fin de la simulation.`);
      break;
    }

    // Determine current party level average
    const aliveHeroes = party.filter((h) => !isDead(h));
    const avgLevel = aliveHeroes.reduce((sum, h) => sum + h.level, 0) / (aliveHeroes.length || 1);

    // Pick monsters
    let selection = allMonsterTypes.filter(
      (m) => avgLevel - 1 < m.hit_dice.num_dice && m.hit_dice.num_dice <= Math.ceil(avgLevel)
    );
    if (selection.length === 0) selection = allMonsterTypes;

    const monsterCount = Math.max(1, Math.min(maxMonsters, rollDie(maxMonsters)));
    const monsters = createSampleMonsters(selection, monsterCount);

    // Reset battle effects
    for (const hero of party) {
      hero.effects = [];
    }

    let battleEnded = false;
    let roundNum = 0;

    while (!battleEnded && roundNum < 50) {
      roundNum++;

      // Compute initiative
      const activeAliveHeroes = party.filter((h) => !isDead(h));
      const activeAliveMonsters = monsters.filter((m) => !isDead(m));
      if (activeAliveHeroes.length === 0 || activeAliveMonsters.length === 0) break;

      const combatants: Combatant[] = [
        ...activeAliveHeroes,
        ...activeAliveMonsters,
      ].sort(() => Math.random() - 0.5);

      for (const combatant of combatants) {
        if (isDead(combatant)) continue;
        if (['unconscious', 'paralyzed'].includes(combatant.condition)) continue;

        if (combatant.is_hero) {
          const hero = combatant as HeroData;
          const currentMonsters = monsters.filter((m) => !isDead(m));
          if (currentMonsters.length === 0) break;

          // Target highest HP monster
          const target = currentMonsters.reduce((prev, curr) => (curr.hp > prev.hp ? curr : prev));

          // Try spellcasting if available
          let spellCast = false;
          if (hero.spells && hero.spells.length > 0) {
            const usable = hero.spells.filter((s) => hero.current_spell_slots[s.level - 1] > 0);
            if (usable.length > 0) {
              const spell = usable[0]; // cast first usable
              hero.current_spell_slots[spell.level - 1] -= 1;
              totalSpellsCast++;
              const lvlIdx = spell.level - 1;
              if (spellsCastByLevel[lvlIdx]) {
                spellsCastByLevel[lvlIdx][spell.name] = (spellsCastByLevel[lvlIdx][spell.name] || 0) + 1;
              }

              const targets: Combatant[] = isBeneficial(spell)
                ? [party.filter((h) => !isDead(h))[0] || hero]
                : [target];
              const spellLogs = resolveSpellEffect(hero, spell, targets);
              spellLogs.forEach((l) => addLog(l));
              spellCast = true;
            }
          }

          if (!spellCast) {
            // Melee attack with multi_attack
            const strikes = hero.multi_attack || 1;
            for (let s = 0; s < strikes; s++) {
              if (isDead(target) || isDead(hero)) break;
              meleeAttack(hero, [target], addLog);
            }
          }

          if (isDead(target)) {
            const lvl = Math.min(20, Math.max(1, target.level));
            const bucket = killedByLevel[lvl - 1];
            bucket[target.name] = (bucket[target.name] || 0) + 1;
            defeatedMonstersCount++;
          }
        } else {
          // Monster turn
          const currentHeroes = party.filter((h) => !isDead(h));
          if (currentHeroes.length === 0) break;

          const frontHeroes = currentHeroes.filter((h) => h.position === 'front');
          const targetPool = frontHeroes.length > 0 ? frontHeroes : currentHeroes;
          const target = targetPool.reduce((prev, curr) => (curr.hp > prev.hp ? curr : prev));

          meleeAttack(combatant, [target], addLog);
        }

        if (party.every((h) => !isDead(h) === false)) {
          battleEnded = true;
          break;
        }
        if (monsters.every((m) => isDead(m))) {
          battleEnded = true;
          break;
        }
      }

      // End of round tick effects
      for (const c of [...party, ...monsters]) {
        tickEffects(c);
      }
    }

    // Post battle outcome
    const livingHeroes = party.filter((h) => !isDead(h));
    if (livingHeroes.length > 0 && monsters.every((m) => isDead(m))) {
      victories++;
      const totalXp = monsters.reduce((sum, m) => sum + (m.xp || 0), 0);
      const totalGp = monsters.reduce((sum, m) => sum + (m.gold || 0), 0);
      const shareXp = Math.floor(totalXp / livingHeroes.length);
      const shareGp = Math.floor(totalGp / livingHeroes.length);
      for (const h of livingHeroes) {
        h.xp += shareXp;
        h.gold += shareGp;
      }
      distributeLoot(monsters, livingHeroes, addLog);
    }
  }

  addLog(`--- SIMULATION TERMINÉE : ${victories} victoires sur ${maxCombats} combats ---`);

  return {
    numCombats: maxCombats,
    victories,
    defeatedMonstersCount,
    totalSpellsCast,
    party,
    killedByLevel,
    spellsCastByLevel,
    logSamples: logs.slice(-100),
  };
}
