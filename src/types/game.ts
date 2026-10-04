export type Condition =
  | 'ok'
  | 'blinded'
  | 'deafened'
  | 'restrained'
  | 'grappled'
  | 'prone'
  | 'charmed'
  | 'frightened'
  | 'incapacitated'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'stunned'
  | 'unconscious'
  | 'invisible'
  | 'exhaustion';

export interface DamageDiceData {
  num_dice: number;
  roll_dice: number;
  bonus?: number;
}

export interface AbilitiesData {
  strength: number;
  intelligence: number;
  dexterity: number;
  wisdom: number;
  constitution: number;
  charisma: number;
}

export interface ActiveEffect {
  kind: string;
  turns: number | null; // null = indefinite until consumed
  magnitude: number;
  spell_name: string;
  extra?: string;
  just_applied: boolean;
}

export interface ArmorItem {
  name: string;
  bonus: number;
}

export interface WeaponItem {
  name: string;
  damage_dice: DamageDiceData;
}

export interface ShieldItem {
  name: string;
  bonus: number;
}

export interface InventoryItem {
  name: string;
  type?: 'weapon' | 'armor' | 'shield' | 'ring' | 'wondrous' | 'potion' | 'consumable' | 'staff' | string;
  damage?: number | string;
  bonus?: number;
  ac?: number;
  heal?: number;
  cure?: boolean;
  buff?: {
    kind: string;
    magnitude: number;
    turns: number;
  };
  rarity?: 'Common' | 'Uncommon' | 'Rare' | 'Very rare' | 'Legendary' | string;
  desc?: string;
  description?: string;
  [key: string]: any;
}

export interface SpellData {
  name: string;
  class_type: string;
  level: number;
  damage_dice: DamageDiceData | null;
  effect: string;
  dc_type: string;
  dc_success: string;
  description: string;
  multi_target?: boolean;
}

export interface CharacterBase {
  id: number;
  name: string;
  level: number;
  hp: number;
  max_hp: number;
  gold: number;
  xp: number;
  condition: Condition;
  is_blessed: boolean;
  abilities: AbilitiesData;
  effects: ActiveEffect[];
  inventory: InventoryItem[];
}

export interface HeroData extends CharacterBase {
  is_hero: true;
  class_type: string;
  race: string;
  armor: ArmorItem;
  weapon: WeaponItem;
  shield: ShieldItem;
  worn: InventoryItem[];
  spellcasting_ability: string;
  spells: SpellData[];
  max_spell_slots: number[];
  current_spell_slots: number[];
  hit_dice: number;
  multi_attack: number;
  position: 'front' | 'back';
}

export interface MonsterTypeData {
  name: string;
  hit_dice: DamageDiceData;
  ac: number;
  damage_dice: DamageDiceData;
  spellcasting?: boolean;
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
}

export interface MonsterData extends CharacterBase {
  is_hero: false;
  monster_type: MonsterTypeData;
  base_ac: number;
  damage_dice: DamageDiceData;
}

export type Combatant = HeroData | MonsterData;

export interface InitiativeEntry {
  combatant: Combatant;
  initiative: number;
}

export interface GameSaveState {
  heroes: any[];
  party_order: string[];
  killed_monsters: Record<string, number>;
  total_kills: number;
  num_combats: number;
}
