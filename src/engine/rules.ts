import { HeroData, SpellData } from '../types/game';
import { isDead } from './character';

/**
 * Table officielle de progression des points d'expérience (XP) D&D 5e (Player's Handbook p. 15)
 * Indice 0 = Niveau 1 (0 XP) ... Indice 19 = Niveau 20 (355 000 XP)
 */
export const DND5E_XP_TABLE: number[] = [
  0, // Niveau 1
  300, // Niveau 2
  900, // Niveau 3
  2700, // Niveau 4
  6500, // Niveau 5
  14000, // Niveau 6
  23000, // Niveau 7
  34000, // Niveau 8
  48000, // Niveau 9
  64000, // Niveau 10
  85000, // Niveau 11
  100000, // Niveau 12
  120000, // Niveau 13
  140000, // Niveau 14
  165000, // Niveau 15
  195000, // Niveau 16
  225000, // Niveau 17
  265000, // Niveau 18
  305000, // Niveau 19
  355000, // Niveau 20
];

/**
 * Seuil d'XP requis pour atteindre un niveau donné
 */
export function getXpForLevel(level: number): number {
  const lvl = Math.min(20, Math.max(1, Math.floor(level)));
  return DND5E_XP_TABLE[lvl - 1];
}

/**
 * Seuil d'XP requis pour passer au niveau supérieur
 */
export function getXpForNextLevel(currentLevel: number): number {
  if (currentLevel >= 20) return DND5E_XP_TABLE[19];
  const nextLvl = Math.max(1, Math.floor(currentLevel)) + 1;
  return DND5E_XP_TABLE[nextLvl - 1] ?? DND5E_XP_TABLE[19];
}

/**
 * Vérifie si un personnage a accumulé suffisamment d'XP pour monter de niveau
 */
export function canHeroLevelUp(hero: { level: number; xp: number }): boolean {
  if (hero.level >= 20) return false;
  return hero.xp >= getXpForNextLevel(hero.level);
}

/**
 * Table officielle de valeur en points d'expérience (XP) par Facteur de Puissance (CR / Niveau) D&D 5e (DMG p. 275)
 */
export const DND5E_CR_XP: Record<number, number> = {
  0: 10,
  1: 200,
  2: 450,
  3: 700,
  4: 1100,
  5: 1800,
  6: 2300,
  7: 2900,
  8: 3900,
  9: 5000,
  10: 5900,
  11: 7200,
  12: 8400,
  13: 10000,
  14: 11500,
  15: 13000,
  16: 15000,
  17: 18000,
  18: 20000,
  19: 22000,
  20: 25000,
};

/**
 * Calcule l'XP exacte d'un monstre selon son niveau de dés de vie et son type selon les règles D&D 5e
 */
export function getMonsterXp(hitDiceNum: number, name?: string): number {
  const lower = (name || '').toLowerCase();
  // Monstres de puissance inférieure à 1 (CR fractions)
  if (hitDiceNum <= 1) {
    if (['kobold', 'giant rat', 'rat'].some((m) => lower.includes(m))) return 25; // CR 1/8
    if (['goblin', 'skeleton'].some((m) => lower.includes(m))) return 50; // CR 1/4
    if (['zombie', 'orc'].some((m) => lower.includes(m))) return 100; // CR 1/2
    return 100;
  }
  const lvl = Math.min(20, Math.max(1, Math.floor(hitDiceNum)));
  return DND5E_CR_XP[lvl] ?? lvl * 400;
}

export const FULL_CASTER_CLASSES = new Set(['Wizard', 'Cleric', 'Druid', 'Sorcerer', 'Bard']);
export const HALF_CASTER_CLASSES = new Set(['Paladin', 'Ranger']);

/**
 * Table officielle des emplacements de sorts D&D 5e pour lanceurs de sorts complets (Full Casters)
 * Niveaux 1 à 20. Chaque sous-tableau comporte 9 éléments représentant les emplacements de niveau 1 à 9.
 */
export const DND5E_FULL_CASTER_SLOTS: number[][] = [
  /* Niv 1  */ [2, 0, 0, 0, 0, 0, 0, 0, 0],
  /* Niv 2  */ [3, 0, 0, 0, 0, 0, 0, 0, 0],
  /* Niv 3  */ [4, 2, 0, 0, 0, 0, 0, 0, 0],
  /* Niv 4  */ [4, 3, 0, 0, 0, 0, 0, 0, 0],
  /* Niv 5  */ [4, 3, 2, 0, 0, 0, 0, 0, 0],
  /* Niv 6  */ [4, 3, 3, 0, 0, 0, 0, 0, 0],
  /* Niv 7  */ [4, 3, 3, 1, 0, 0, 0, 0, 0],
  /* Niv 8  */ [4, 3, 3, 2, 0, 0, 0, 0, 0],
  /* Niv 9  */ [4, 3, 3, 3, 1, 0, 0, 0, 0],
  /* Niv 10 */ [4, 3, 3, 3, 2, 0, 0, 0, 0],
  /* Niv 11 */ [4, 3, 3, 3, 2, 1, 0, 0, 0],
  /* Niv 12 */ [4, 3, 3, 3, 2, 1, 0, 0, 0],
  /* Niv 13 */ [4, 3, 3, 3, 2, 1, 1, 0, 0],
  /* Niv 14 */ [4, 3, 3, 3, 2, 1, 1, 0, 0],
  /* Niv 15 */ [4, 3, 3, 3, 2, 1, 1, 1, 0],
  /* Niv 16 */ [4, 3, 3, 3, 2, 1, 1, 1, 0],
  /* Niv 17 */ [4, 3, 3, 3, 2, 1, 1, 1, 1],
  /* Niv 18 */ [4, 3, 3, 3, 3, 1, 1, 1, 1],
  /* Niv 19 */ [4, 3, 3, 3, 3, 2, 1, 1, 1],
  /* Niv 20 */ [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/**
 * Table officielle des emplacements de sorts D&D 5e pour demi-lanceurs de sorts (Half Casters : Paladin, Ranger)
 * Niveaux 1 à 20. Chaque sous-tableau comporte 9 éléments représentant les emplacements de niveau 1 à 9.
 */
export const DND5E_HALF_CASTER_SLOTS: number[][] = [
  /* Niv 1  */ [0, 0, 0, 0, 0, 0, 0, 0, 0],
  /* Niv 2  */ [2, 0, 0, 0, 0, 0, 0, 0, 0],
  /* Niv 3  */ [3, 0, 0, 0, 0, 0, 0, 0, 0],
  /* Niv 4  */ [3, 0, 0, 0, 0, 0, 0, 0, 0],
  /* Niv 5  */ [4, 2, 0, 0, 0, 0, 0, 0, 0],
  /* Niv 6  */ [4, 2, 0, 0, 0, 0, 0, 0, 0],
  /* Niv 7  */ [4, 3, 0, 0, 0, 0, 0, 0, 0],
  /* Niv 8  */ [4, 3, 0, 0, 0, 0, 0, 0, 0],
  /* Niv 9  */ [4, 3, 2, 0, 0, 0, 0, 0, 0],
  /* Niv 10 */ [4, 3, 2, 0, 0, 0, 0, 0, 0],
  /* Niv 11 */ [4, 3, 3, 0, 0, 0, 0, 0, 0],
  /* Niv 12 */ [4, 3, 3, 0, 0, 0, 0, 0, 0],
  /* Niv 13 */ [4, 3, 3, 1, 0, 0, 0, 0, 0],
  /* Niv 14 */ [4, 3, 3, 1, 0, 0, 0, 0, 0],
  /* Niv 15 */ [4, 3, 3, 2, 0, 0, 0, 0, 0],
  /* Niv 16 */ [4, 3, 3, 2, 0, 0, 0, 0, 0],
  /* Niv 17 */ [4, 3, 3, 3, 1, 0, 0, 0, 0],
  /* Niv 18 */ [4, 3, 3, 3, 1, 0, 0, 0, 0],
  /* Niv 19 */ [4, 3, 3, 3, 2, 0, 0, 0, 0],
  /* Niv 20 */ [4, 3, 3, 3, 2, 0, 0, 0, 0],
];

/**
 * Retourne la répartition exacte des emplacements de sorts D&D 5e pour une classe et un niveau donnés
 */
export function getDnd5eSpellSlots(classType: string, level: number): number[] {
  const lvl = Math.min(20, Math.max(1, Math.floor(level)));
  if (FULL_CASTER_CLASSES.has(classType)) {
    return [...DND5E_FULL_CASTER_SLOTS[lvl - 1]];
  }
  if (HALF_CASTER_CLASSES.has(classType)) {
    return [...DND5E_HALF_CASTER_SLOTS[lvl - 1]];
  }
  return new Array(9).fill(0);
}

/**
 * Variante officielle Dungeon Master's Guide (p. 288) : Points de sorts (Spell Points System)
 */
export const DND5E_SPELL_POINTS_BY_LEVEL: number[] = [
  /* Niv 1  */ 4,
  /* Niv 2  */ 6,
  /* Niv 3  */ 14,
  /* Niv 4  */ 17,
  /* Niv 5  */ 27,
  /* Niv 6  */ 32,
  /* Niv 7  */ 38,
  /* Niv 8  */ 44,
  /* Niv 9  */ 57,
  /* Niv 10 */ 64,
  /* Niv 11 */ 73,
  /* Niv 12 */ 73,
  /* Niv 13 */ 83,
  /* Niv 14 */ 83,
  /* Niv 15 */ 94,
  /* Niv 16 */ 94,
  /* Niv 17 */ 107,
  /* Niv 18 */ 114,
  /* Niv 19 */ 123,
  /* Niv 20 */ 133,
];

export const SPELL_LEVEL_POINT_COST: Record<number, number> = {
  1: 2,
  2: 3,
  3: 5,
  4: 6,
  5: 7,
  6: 9,
  7: 10,
  8: 11,
  9: 13,
};

export function getDnd5eSpellPoints(classType: string, level: number): number {
  const lvl = Math.min(20, Math.max(1, Math.floor(level)));
  if (FULL_CASTER_CLASSES.has(classType)) {
    return DND5E_SPELL_POINTS_BY_LEVEL[lvl - 1];
  }
  if (HALF_CASTER_CLASSES.has(classType)) {
    return Math.floor(DND5E_SPELL_POINTS_BY_LEVEL[Math.floor(lvl / 2)] / 2);
  }
  return 0;
}

/**
 * Trie une liste de sorts de façon stable par niveau puis par nom
 */
export function sortSpellsByLevel(spells: SpellData[], descending = false): SpellData[] {
  return [...spells].sort((a, b) => {
    if (a.level !== b.level) {
      return descending ? b.level - a.level : a.level - b.level;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Détermine le sort disponible de plus haut niveau pour un héros actif
 * (c'est-à-dire qui possède au moins 1 emplacement de sort restant pour son niveau)
 */
export function getHighestAvailableSpell(hero: HeroData | null): SpellData | null {
  if (!hero || !hero.spells || hero.spells.length === 0) return null;

  // Filtrer les sorts lançables ayant encore des emplacements disponibles
  const castable = hero.spells.filter((s) => {
    const slotIdx = s.level - 1;
    return (hero.current_spell_slots[slotIdx] || 0) > 0;
  });

  if (castable.length > 0) {
    // Trier par niveau décroissant et prendre le premier
    return [...castable].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))[0];
  }

  // Si aucun emplacement n'est disponible, pointer quand même sur le sort de plus haut niveau connu
  return [...hero.spells].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))[0];
}

export type LinePosition = 'front' | 'middle' | 'back';

export interface TacticalLineStatus {
  line: LinePosition;
  label: string;
  total: number;
  alive: number;
  dead: number;
  hasCasualties: boolean;
  isProtected: boolean;
  protectionReason: string;
  isBreached: boolean;
}

/**
 * Vérifie si une ligne est protégée (empêchant les monstres d'exploiter une brèche)
 * Une ligne est protégée si au moins un héros survivant sur cette ligne :
 * 1) Bénéficie d'un sort/effet de protection magique actif (shield, death_ward, sanctuary, foresight, protection, bless)
 * 2) Ou porte un bouclier actif (bonus > 0 et nom !== 'None') qui verrouille la ligne
 */
export function checkLineProtection(livingHeroesOnLine: HeroData[]): {
  isProtected: boolean;
  reason: string;
} {
  if (livingHeroesOnLine.length === 0) {
    return { isProtected: false, reason: 'Tous les défenseurs de la ligne sont tombés' };
  }

  // 1. Protection magique active sur l'un des héros vivants de la ligne
  const magicallyProtected = livingHeroesOnLine.find(
    (h) =>
      h.effects.some((e) =>
        ['shield', 'death_ward', 'sanctuary', 'foresight', 'protection'].includes(e.kind)
      ) || h.is_blessed
  );
  if (magicallyProtected) {
    const eff = magicallyProtected.effects.find((e) =>
      ['shield', 'death_ward', 'sanctuary', 'foresight', 'protection'].includes(e.kind)
    );
    const effName = eff ? (eff.spell_name || eff.kind) : 'Bénédiction (Bless)';
    return {
      isProtected: true,
      reason: `Protection magique active (${effName} sur ${magicallyProtected.name})`,
    };
  }

  // 2. Porteur de bouclier (Garde / Tank tenant la brèche)
  const shieldBearer = livingHeroesOnLine.find(
    (h) => h.shield && h.shield.bonus > 0 && h.shield.name !== 'None'
  );
  if (shieldBearer) {
    return {
      isProtected: true,
      reason: `Bouclier de ${shieldBearer.name} (${shieldBearer.shield.name}) verrouille la ligne`,
    };
  }

  return {
    isProtected: false,
    reason: 'Aucun bouclier ni protection magique active pour verrouiller la brèche',
  };
}

/**
 * Évalue la formation tactique (2 rangées si <= 6 joueurs, 3 rangées Avant/Milieu/Arrière si > 6 joueurs)
 * et détermine si une brèche est ouverte pour les attaques en mêlée des monstres.
 */
export function evaluateTacticalFormation(party: HeroData[]): {
  frontLine: TacticalLineStatus;
  middleLine?: TacticalLineStatus;
  backLine: TacticalLineStatus;
  targetPool: HeroData[];
  isBreached: boolean;
  logMessage: string;
} {
  const isTripartite = party.length > 6 || party.some((h) => h.position === 'middle');

  const frontHeroes = party.filter((h) => h.position === 'front');
  const middleHeroes = isTripartite ? party.filter((h) => h.position === 'middle') : [];
  const backHeroes = party.filter((h) => h.position === 'back');

  const livingFront = frontHeroes.filter((h) => !isDead(h));
  const livingMiddle = middleHeroes.filter((h) => !isDead(h));
  const livingBack = backHeroes.filter((h) => !isDead(h));

  const frontCasualties = frontHeroes.length > 0 && livingFront.length < frontHeroes.length;
  const frontProt = checkLineProtection(livingFront);
  const frontBreached = frontCasualties && !frontProt.isProtected;

  const frontStatus: TacticalLineStatus = {
    line: 'front',
    label: 'Première Ligne (Avant)',
    total: frontHeroes.length,
    alive: livingFront.length,
    dead: frontHeroes.length - livingFront.length,
    hasCasualties: frontCasualties,
    isProtected: frontProt.isProtected,
    protectionReason: frontProt.reason,
    isBreached: frontBreached,
  };

  let middleStatus: TacticalLineStatus | undefined = undefined;
  let middleBreached = false;

  if (isTripartite && middleHeroes.length > 0) {
    const middleCasualties = livingMiddle.length < middleHeroes.length;
    const middleProt = checkLineProtection(livingMiddle);
    middleBreached = middleCasualties && !middleProt.isProtected;

    middleStatus = {
      line: 'middle',
      label: 'Ligne Médiane (Milieu)',
      total: middleHeroes.length,
      alive: livingMiddle.length,
      dead: middleHeroes.length - livingMiddle.length,
      hasCasualties: middleCasualties,
      isProtected: middleProt.isProtected,
      protectionReason: middleProt.reason,
      isBreached: middleBreached,
    };
  }

  const backStatus: TacticalLineStatus = {
    line: 'back',
    label: 'Ligne Arrière (Back)',
    total: backHeroes.length,
    alive: livingBack.length,
    dead: backHeroes.length - livingBack.length,
    hasCasualties: backHeroes.length > 0 && livingBack.length < backHeroes.length,
    isProtected: checkLineProtection(livingBack).isProtected,
    protectionReason: checkLineProtection(livingBack).reason,
    isBreached: false,
  };

  // Règles de mêlée :
  // 1. Seule la première ligne peut être attaquée en mêlée par les monstres.
  // 2. Si un héros meurt sur la ligne avant, cela ouvre une brèche et permet aux monstres
  //    d'attaquer la ligne secondaire (Milieu si >6, sinon Arrière), sauf si la ligne primaire est protégée !
  let targetPool: HeroData[] = [];
  let isBreached = false;
  let logMessage = '';

  if (livingFront.length > 0) {
    if (!frontCasualties) {
      targetPool = livingFront;
      isBreached = false;
      logMessage = 'Première ligne intacte : seuls les héros de première ligne sont exposés à la mêlée.';
    } else if (frontProt.isProtected) {
      targetPool = livingFront;
      isBreached = false;
      logMessage = `La première ligne a subi des pertes mais la brèche est verrouillée (${frontProt.reason}) : ligne secondaire protégée.`;
    } else {
      // Brèche ouverte !
      isBreached = true;
      const secondaryPool = isTripartite && livingMiddle.length > 0 ? livingMiddle : livingBack;
      targetPool = [...livingFront, ...secondaryPool];
      const secName = isTripartite && livingMiddle.length > 0 ? 'ligne médiane' : 'ligne arrière';
      logMessage = `⚠️ Brèche dans la première ligne ! Les monstres s'engouffrent et peuvent attaquer la ${secName} en mêlée !`;
    }
  } else if (isTripartite && livingMiddle.length > 0) {
    // La ligne avant est entièrement tombée
    if (!middleStatus?.hasCasualties || middleStatus.isProtected) {
      targetPool = livingMiddle;
      isBreached = true;
      logMessage = 'La première ligne a cédé : la ligne médiane fait désormais office de front.';
    } else {
      // La ligne médiane est aussi percée !
      targetPool = [...livingMiddle, ...livingBack];
      isBreached = true;
      logMessage = '⚠️ Première ligne et ligne médiane percées ! Les monstres atteignent l\'arrière-garde !';
    }
  } else if (livingBack.length > 0) {
    targetPool = livingBack;
    isBreached = true;
    logMessage = 'Dernier rempart : seule l\'arrière-garde subsiste.';
  } else {
    targetPool = party.filter((h) => !isDead(h));
  }

  return {
    frontLine: frontStatus,
    middleLine: middleStatus,
    backLine: backStatus,
    targetPool,
    isBreached,
    logMessage,
  };
}

/**
 * Assigne les positions ('front' | 'middle' | 'back') selon la taille du groupe :
 * - Si le groupe comporte plus de 6 membres : répartition tri-partite Avant / Milieu / Arrière.
 * - Si le groupe comporte <= 6 membres : répartition bi-partite Avant / Arrière (3 max devant).
 */
export function assignFormationPositions(party: HeroData[]): HeroData[] {
  const n = party.length;
  if (n <= 6) {
    const frontCount = Math.min(3, Math.ceil(n / 2));
    return party.map((h, i) => ({
      ...h,
      position: (i < frontCount ? 'front' : 'back') as LinePosition,
    }));
  }

  // Formation tri-partite Avant / Milieu / Arrière pour n > 6
  const frontCount = Math.ceil(n / 3);
  const middleCount = Math.round((n - frontCount) / 2);

  return party.map((h, i) => {
    let pos: LinePosition = 'front';
    if (i < frontCount) {
      pos = 'front';
    } else if (i < frontCount + middleCount) {
      pos = 'middle';
    } else {
      pos = 'back';
    }
    return {
      ...h,
      position: pos,
    };
  });
}

