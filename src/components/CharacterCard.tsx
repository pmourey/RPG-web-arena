import React from 'react';
import { Combatant, HeroData, MonsterData } from '../types/game';
import { getArmorClass, isDead } from '../engine/character';
import { canHeroLevelUp } from '../engine/rules';
import { Shield, Sparkles, Skull, Heart, Info, ArrowUpCircle } from 'lucide-react';

interface CharacterCardProps {
  character: Combatant;
  isSelected: boolean;
  isCurrentTurn: boolean;
  onClick: () => void;
  onOpenSheet?: () => void;
  cardSize?: number;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  isSelected,
  isCurrentTurn,
  onClick,
  onOpenSheet,
  cardSize,
}) => {
  const dead = isDead(character);
  const maxHp = Math.max(1, character.max_hp);
  const curHp = Math.max(0, character.hp);
  const hpPct = Math.min(100, Math.max(0, (curHp / maxHp) * 100));

  let hpBarColor = 'bg-emerald-500';
  if (hpPct <= 20) hpBarColor = 'bg-rose-500';
  else if (hpPct <= 50) hpBarColor = 'bg-amber-500';

  const ac = getArmorClass(character);

  // Strict bounding to ensure game info fits (min 96px) and prevents vertical scrolling / voids (max 138px)
  const sizePx = cardSize ? Math.min(138, Math.max(96, cardSize)) : undefined;
  const isCompact = sizePx ? sizePx <= 116 : true;

  const getSubtitle = () => {
    if (character.is_hero) {
      const h = character as HeroData;
      return `${h.class_type} • ${h.race} • Niv.${h.level} • CA ${ac}`;
    }
    const m = character as MonsterData;
    return `Niv.${m.level} • CA ${ac}`;
  };

  const getExtra = () => {
    if (character.is_hero) {
      const h = character as HeroData;
      const slots = h.current_spell_slots
        .map((cur, i) => (h.max_spell_slots[i] > 0 ? `L${i + 1}:${cur}/${h.max_spell_slots[i]}` : null))
        .filter(Boolean)
        .join(' ');
      const posLabel = h.position === 'front' ? '⚔️ Avant' : h.position === 'middle' ? '🛡️ Milieu' : '🏹 Arrière';
      return slots || posLabel;
    }
    const m = character as MonsterData;
    return `Dégâts: ${m.damage_dice.num_dice}d${m.damage_dice.roll_dice}`;
  };

  return (
    <div
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpenSheet?.();
      }}
      style={
        sizePx
          ? {
              width: `${sizePx}px`,
              height: `${sizePx}px`,
              minWidth: `${sizePx}px`,
              maxWidth: `${sizePx}px`,
            }
          : undefined
      }
      className={`relative select-none rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between touch-manipulation aspect-square w-full min-w-[96px] max-w-[138px] mx-auto overflow-hidden shrink-0 ${
        isCompact ? 'p-1.5' : 'p-2'
      } ${
        dead
          ? 'bg-stone-900/60 border-stone-800 opacity-60'
          : isSelected
          ? 'bg-stone-800/90 border-blue-500 shadow-md shadow-blue-500/20 ring-2 ring-blue-500'
          : isCurrentTurn
          ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/25 ring-2 ring-amber-500 animate-pulse'
          : 'bg-stone-800/60 border-stone-700/80 hover:border-stone-500 hover:bg-stone-800 active:bg-stone-750'
      }`}
    >
      {/* Top row: Name + Badges + Sheet Button */}
      <div className="flex items-start justify-between gap-0.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-0.5 flex-wrap">
            <span
              className={`font-bold truncate text-[11px] sm:text-xs ${
                dead ? 'line-through text-stone-500' : 'text-stone-100'
              }`}
            >
              {character.name}
            </span>
            {isCurrentTurn && (
              <span className="px-1 py-0.2 text-[7.5px] uppercase font-bold tracking-wider bg-amber-500 text-stone-950 rounded">
                Tour
              </span>
            )}
            {character.condition !== 'ok' && (
              <span className="px-1 py-0.2 text-[7.5px] uppercase font-bold bg-rose-900/80 text-rose-200 border border-rose-700/50 rounded">
                {character.condition}
              </span>
            )}
            {character.is_blessed && (
              <span className="px-1 py-0.2 text-[7.5px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded flex items-center gap-0.5">
                <Sparkles className="w-2 h-2" /> Bless
              </span>
            )}
            {character.is_hero && canHeroLevelUp(character as HeroData) && (
              <span
                title="Prêt pour montée de niveau ! (Prendre un Repos complet)"
                className="px-1 py-0.2 text-[7.5px] font-black uppercase tracking-tight bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 rounded shadow-xs animate-bounce flex items-center gap-0.5"
              >
                <ArrowUpCircle className="w-2 h-2" /> Niv+
              </span>
            )}
          </div>
          <div className="text-[8.5px] sm:text-[9px] text-stone-400 mt-0.5 truncate leading-tight">
            {getSubtitle()}
          </div>
        </div>

        {onOpenSheet && (
          <button
            type="button"
            title="Ouvrir la fiche de personnage (Double-clic)"
            aria-label={`Fiche de ${character.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenSheet();
            }}
            className="p-0.5 -mr-1 -mt-0.5 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-700/60 active:bg-stone-700 transition-colors shrink-0"
          >
            <Info className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Middle row: Armor Class & Position/Damage stats badge */}
      <div className="flex items-center gap-1 flex-wrap my-0.5">
        <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1 py-0.2 rounded bg-stone-900/90 text-stone-200 border border-stone-700/70 shadow-xs">
          <Shield className="w-2.5 h-2.5 text-amber-400 shrink-0" />
          <span>CA {ac}</span>
        </span>
        {character.is_hero ? (
          <span className="text-[8px] sm:text-[8.5px] text-stone-300 px-1 py-0.2 rounded bg-stone-900/60 border border-stone-800 truncate">
            {(character as HeroData).position === 'front'
              ? '⚔️ Avant'
              : (character as HeroData).position === 'middle'
              ? '🛡️ Milieu'
              : '🏹 Arrière'}
          </span>
        ) : (
          <span className="text-[8px] sm:text-[8.5px] text-rose-300 font-mono px-1 py-0.2 rounded bg-stone-900/60 border border-stone-800">
            {(character as MonsterData).damage_dice.num_dice}d{(character as MonsterData).damage_dice.roll_dice}
          </span>
        )}
      </div>

      {/* HP Bar */}
      <div className="my-0.5">
        <div className="flex justify-between items-center text-[8.5px] sm:text-[9px] mb-0.5 font-medium">
          <span className="flex items-center gap-1 text-stone-200 truncate">
            {dead ? (
              <Skull className="w-2.5 h-2.5 text-rose-400 shrink-0" />
            ) : (
              <Heart className="w-2.5 h-2.5 text-rose-400 shrink-0" />
            )}
            <span>{dead ? 'Mort' : `${curHp}/${maxHp} PV`}</span>
          </span>
          <span className="text-stone-400 font-mono text-[8px] shrink-0">
            {Math.round(hpPct)}%
          </span>
        </div>
        <div className="h-1 sm:h-1.5 w-full bg-stone-950/80 rounded-full overflow-hidden border border-stone-800">
          <div
            className={`h-full transition-all duration-300 ${hpBarColor}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      {/* Footer Info / Spell Slots */}
      <div className="text-[8px] text-stone-400 flex items-center justify-between pt-0.5 border-t border-stone-800/60 mt-auto">
        <span className="truncate">{getExtra()}</span>
        {character.is_hero && (character as HeroData).multi_attack > 1 && (
          <span className="text-amber-400 font-semibold ml-1 shrink-0">
            x{(character as HeroData).multi_attack} atk
          </span>
        )}
      </div>
    </div>
  );
};
