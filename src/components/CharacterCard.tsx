import React from 'react';
import { Combatant, HeroData, MonsterData } from '../types/game';
import { getArmorClass, isDead } from '../engine/character';
import { Shield, Sparkles, Skull, Heart, Info } from 'lucide-react';

interface CharacterCardProps {
  character: Combatant;
  isSelected: boolean;
  isCurrentTurn: boolean;
  onClick: () => void;
  onOpenSheet?: () => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  isSelected,
  isCurrentTurn,
  onClick,
  onOpenSheet,
}) => {
  const dead = isDead(character);
  const maxHp = Math.max(1, character.max_hp);
  const curHp = Math.max(0, character.hp);
  const hpPct = Math.min(100, Math.max(0, (curHp / maxHp) * 100));

  let hpBarColor = 'bg-emerald-500';
  if (hpPct <= 20) hpBarColor = 'bg-rose-500';
  else if (hpPct <= 50) hpBarColor = 'bg-amber-500';

  const ac = getArmorClass(character);

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
      return slots || (h.position === 'front' ? '⚔️ Front-line' : '🏹 Back-line');
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
      className={`relative select-none p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        dead
          ? 'bg-stone-900/60 border-stone-800 opacity-60'
          : isSelected
          ? 'bg-stone-800/90 border-blue-500 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500'
          : isCurrentTurn
          ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-500/25 ring-2 ring-amber-500 animate-pulse'
          : 'bg-stone-800/60 border-stone-700/80 hover:border-stone-500 hover:bg-stone-800'
      }`}
      style={{ minHeight: '120px' }}
    >
      {/* Top row: Name + Sheet Button */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-semibold text-sm truncate ${dead ? 'line-through text-stone-500' : 'text-stone-100'}`}>
              {character.name}
            </span>
            {isCurrentTurn && (
              <span className="px-1.5 py-0.2 text-[10px] uppercase font-bold tracking-wider bg-amber-500 text-stone-950 rounded">
                Tour
              </span>
            )}
            {character.condition !== 'ok' && (
              <span className="px-1.5 py-0.2 text-[10px] uppercase font-bold bg-rose-900/80 text-rose-200 border border-rose-700/50 rounded">
                {character.condition}
              </span>
            )}
            {character.is_blessed && (
              <span className="px-1 py-0.2 text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> Bless
              </span>
            )}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5 truncate">{getSubtitle()}</div>
        </div>

        {onOpenSheet && (
          <button
            type="button"
            title="Ouvrir la fiche de personnage (Double-clic)"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSheet();
            }}
            className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-700/60 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* HP Bar */}
      <div className="my-1.5">
        <div className="flex justify-between text-[11px] mb-1">
          <span className="flex items-center gap-1 font-medium text-stone-300">
            {dead ? <Skull className="w-3 h-3 text-rose-400" /> : <Heart className="w-3 h-3 text-rose-400" />}
            {dead ? 'Mort' : `${curHp}/${maxHp} PV`}
          </span>
          <span className="text-stone-400 font-mono text-[10px]">{Math.round(hpPct)}%</span>
        </div>
        <div className="h-2 w-full bg-stone-950/80 rounded-full overflow-hidden border border-stone-800">
          <div
            className={`h-full transition-all duration-300 ${hpBarColor}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      {/* Footer Info / Spell Slots */}
      <div className="text-[10px] text-stone-400 flex items-center justify-between pt-1 border-t border-stone-800/60">
        <span className="truncate">{getExtra()}</span>
        {character.is_hero && (character as HeroData).multi_attack > 1 && (
          <span className="text-amber-400/90 font-medium ml-1">
            x{(character as HeroData).multi_attack} atk
          </span>
        )}
      </div>
    </div>
  );
};
