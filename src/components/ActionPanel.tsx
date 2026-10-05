import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Combatant, HeroData, SpellData } from '../types/game';
import { isBeneficial } from '../engine/effects';
import { isDead } from '../engine/character';
import { sortSpellsByLevel, getHighestAvailableSpell } from '../engine/rules';
import {
  Sword,
  Sparkles,
  Flame,
  HeartHandshake,
  ArrowUpDown,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface ActionPanelProps {
  currentHero: HeroData | null;
  selectedTarget: Combatant | null;
  combatOver: boolean;
  onMelee: () => void;
  onCastSpell: (spell: SpellData) => void;
  onDefendLine?: () => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  currentHero,
  selectedTarget,
  combatOver,
  onMelee,
  onCastSpell,
  onDefendLine,
}) => {
  const canAct = !combatOver && currentHero !== null;
  const targetIsLivingMonster = selectedTarget && !selectedTarget.is_hero && !isDead(selectedTarget);
  const canMelee = canAct && Boolean(targetIsLivingMonster);

  // Preference for sort direction: default TRUE (décroissant 9->1, sorts de plus haut niveau en premier!)
  // This ensures spells like 'Greater Heal' (Niv 3) and 'Spiritual Weapon' (Niv 2) appear immediately at the start!
  const [sortDescending, setSortDescending] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rpg_spell_sort_desc');
      if (saved !== null) {
        return saved === 'true';
      }
      return true; // Default to descending: highest level spells first!
    } catch {
      return true;
    }
  });

  const toggleSortOrder = () => {
    setSortDescending((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('rpg_spell_sort_desc', String(next));
      } catch {}
      return next;
    });
  };

  // Determine highest level available spell (with remaining slots)
  const highestAvailableSpell = useMemo(() => {
    return getHighestAvailableSpell(currentHero);
  }, [currentHero]);

  // Sort spells according to user preference
  const sortedSpells = useMemo(() => {
    if (!currentHero || !currentHero.spells) return [];
    return sortSpellsByLevel(currentHero.spells, sortDescending);
  }, [currentHero, sortDescending]);

  // Reference to spell buttons and container for automatic cursor auto-scroll
  const spellContainerRef = useRef<HTMLDivElement>(null);
  const spellButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Auto-scroll to highest available spell as soon as active hero's turn starts
  useEffect(() => {
    if (highestAvailableSpell && spellContainerRef.current) {
      const timer = setTimeout(() => {
        const targetBtn = spellButtonRefs.current.get(highestAvailableSpell.name);
        if (targetBtn && spellContainerRef.current) {
          targetBtn.scrollIntoView({
            behavior: 'smooth',
            inline: 'nearest',
            block: 'nearest',
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentHero?.id, highestAvailableSpell?.name, sortDescending]);

  const hasProtectionBuff = currentHero?.effects.some(
    (e) => ['protection', 'shield', 'sanctuary', 'death_ward'].includes(e.kind)
  );

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-2 sm:p-2.5 shadow-lg">
      <div className="flex items-center justify-between mb-1 pb-0.5 border-b border-stone-800">
        <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
          <Sword className="w-3 h-3 text-amber-500" />
          Actions disponibles
        </h3>
        {currentHero && (
          <span className="text-[9.5px] sm:text-[10.5px] text-amber-400 font-medium">
            Attaques : <strong className="font-bold">{currentHero.multi_attack || 1}x</strong>
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {/* Row 1: Attack and Defend Tactical Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {/* Melee attack */}
          <div>
            <button
              type="button"
              onClick={onMelee}
              disabled={!canMelee}
              className={`w-full py-1.5 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all touch-manipulation ${
                canMelee
                  ? 'bg-rose-700 hover:bg-rose-600 active:scale-[0.98] text-white shadow-rose-900/30'
                  : 'bg-stone-800/80 text-stone-500 border border-stone-800 cursor-not-allowed'
              }`}
            >
              <Sword className="w-3 h-3" />
              <span>
                ⚔️ Attaque Mêlée{' '}
                {currentHero?.multi_attack && currentHero.multi_attack > 1
                  ? `(${currentHero.multi_attack}x)`
                  : ''}
              </span>
            </button>
            {!canMelee && canAct && (
              <p className="text-[9px] text-stone-500 text-center mt-0.5">
                {!selectedTarget
                  ? 'Sélectionnez un monstre pour attaquer en mêlée'
                  : selectedTarget.is_hero
                  ? 'Impossible d’attaquer un allié'
                  : isDead(selectedTarget)
                  ? 'Ce monstre est déjà vaincu'
                  : ''}
              </p>
            )}
          </div>

          {/* Defend / Protect the line (locks breaches and shields secondary lines) */}
          {onDefendLine && (
            <div>
              <button
                type="button"
                onClick={onDefendLine}
                disabled={!canAct}
                title="Prendre une posture défensive : +2 CA pendant 1 round et verrouille la ligne contre toute brèche tactique pour protéger les lignes arrières."
                className={`w-full py-1.5 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all touch-manipulation ${
                  canAct
                    ? hasProtectionBuff
                      ? 'bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-500/50'
                      : 'bg-amber-900/70 hover:bg-amber-800 text-amber-100 border border-amber-600/60'
                    : 'bg-stone-800/80 text-stone-500 border border-stone-800 cursor-not-allowed'
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                <span>
                  🛡️ Protéger la Ligne {hasProtectionBuff ? '(Active)' : '(+2 CA & Brèche)'}
                </span>
              </button>
              {canAct && (
                <p className="text-[9px] text-stone-400 text-center mt-0.5">
                  Verrouille la brèche : protège les rangs arrières des attaques de mêlée
                </p>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Spells Section */}
        {currentHero && (
          <div className="pt-1 border-t border-stone-800/70">
            <div className="text-[9.5px] text-stone-400 font-medium mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                <span>Sorts disponibles :</span>
                {highestAvailableSpell && (
                  <span className="text-[9px] text-amber-300 font-semibold hidden sm:inline">
                    (Curseur sur : <strong>{highestAvailableSpell.name}</strong> Niv.{highestAvailableSpell.level})
                  </span>
                )}
              </div>

              {/* Sort direction toggle */}
              {currentHero.spells.length > 1 && (
                <button
                  type="button"
                  onClick={toggleSortOrder}
                  title={
                    sortDescending
                      ? 'Passer au tri croissant (1➔9)'
                      : 'Passer au tri décroissant (9➔1, sorts max en premier)'
                  }
                  className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700/80 text-[8.5px] text-stone-300 hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  <ArrowUpDown className="w-2.5 h-2.5 text-amber-400" />
                  <span>{sortDescending ? 'Niveau ▼ (9➔1, Max d\'abord)' : 'Niveau ▲ (1➔9)'}</span>
                </button>
              )}
            </div>

            {/* Quick-Cast Button for Highest Available Spell */}
            {canAct && highestAvailableSpell && (
              <div className="mb-1.5">
                {(() => {
                  const s = highestAvailableSpell;
                  const slots = currentHero.current_spell_slots[s.level - 1] || 0;
                  const maxSlots = currentHero.max_spell_slots[s.level - 1] || 0;
                  const canCastQuick = slots > 0;
                  const beneficial = isBeneficial(s);

                  return (
                    <button
                      type="button"
                      onClick={() => onCastSpell(s)}
                      disabled={!canCastQuick}
                      title={`Lancer immédiatement le sort max disponible : ${s.name} (Niveau ${s.level})`}
                      className={`w-full py-1 px-2 rounded-lg text-[10.5px] sm:text-xs font-bold flex items-center justify-between gap-1.5 border transition-all ${
                        canCastQuick
                          ? 'bg-amber-950/60 hover:bg-amber-900/80 border-amber-500 text-amber-100 shadow-sm'
                          : 'bg-stone-900/50 border-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="font-extrabold text-amber-400 uppercase text-[9px] tracking-wider">
                          ✦ Curseur Max :
                        </span>
                        <span className="truncate">{s.name}</span>
                        <span className="text-[9px] px-1 rounded bg-stone-800 text-stone-300 border border-stone-700 font-mono">
                          Niv.{s.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[9.5px]">
                        <span className={beneficial ? 'text-emerald-400' : 'text-rose-400'}>
                          {beneficial ? 'Soin / Soutien' : 'Offensif'}
                        </span>
                        <span className="text-amber-300 font-bold">
                          {slots}/{maxSlots} emplacements
                        </span>
                      </div>
                    </button>
                  );
                })()}
              </div>
            )}

            {currentHero.spells.length === 0 ? (
              <div className="p-1.5 text-center text-[10px] text-stone-500 bg-stone-950/40 rounded-lg border border-stone-800/60">
                {currentHero.name} n'est pas un lanceur de sorts.
              </div>
            ) : (
              <div
                ref={spellContainerRef}
                className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-stone-700 touch-pan-x overscroll-x-contain -mx-1 px-1 scroll-smooth"
              >
                {sortedSpells.map((spell, idx) => {
                  const slotsLeft = currentHero.current_spell_slots[spell.level - 1] || 0;
                  const slotsMax = currentHero.max_spell_slots[spell.level - 1] || 0;
                  const canCast = canAct && slotsLeft > 0;
                  const beneficial = isBeneficial(spell);
                  const isCursor = highestAvailableSpell?.name === spell.name;

                  return (
                    <button
                      key={`${spell.name}-${idx}`}
                      ref={(el) => {
                        if (el) spellButtonRefs.current.set(spell.name, el);
                        else spellButtonRefs.current.delete(spell.name);
                      }}
                      type="button"
                      onClick={() => onCastSpell(spell)}
                      disabled={!canCast}
                      title={`${spell.name} (Niveau ${spell.level})\n${spell.description}${
                        isCursor
                          ? '\n[★ Curseur par défaut : Sort disponible de plus haut niveau]'
                          : ''
                      }`}
                      className={`shrink-0 p-1 sm:p-1.5 rounded-lg border text-left transition-all min-w-[122px] sm:min-w-[136px] max-w-[160px] flex flex-col justify-between touch-manipulation active:scale-[0.98] relative ${
                        isCursor
                          ? 'ring-2 ring-amber-400 shadow-md shadow-amber-500/25 bg-amber-950/60 border-amber-400'
                          : ''
                      } ${
                        canCast
                          ? beneficial
                            ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-600/70 text-emerald-100 hover:border-emerald-400'
                            : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-600/70 text-amber-100 hover:border-amber-400'
                          : 'bg-stone-900/60 border-stone-800 text-stone-600 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <div className="font-bold text-[9.5px] sm:text-[10px] truncate flex items-center gap-1">
                          {beneficial ? (
                            <HeartHandshake className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Flame className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">{spell.name}</span>
                        </div>
                        {isCursor && (
                          <span
                            title="Curseur actif par défaut (Sort max disponible)"
                            className="px-1 py-0.2 rounded text-[7px] bg-amber-400 text-stone-950 font-black tracking-tight shrink-0 shadow-xs uppercase"
                          >
                            MAX
                          </span>
                        )}
                      </div>
                      <div className="text-[8.5px] text-stone-400 flex items-center justify-between">
                        <span className="font-semibold text-stone-300">Niv.{spell.level}</span>
                        <span
                          className={`font-mono font-bold ${
                            slotsLeft > 0 ? 'text-amber-400' : 'text-stone-600'
                          }`}
                        >
                          {slotsLeft}/{slotsMax}
                        </span>
                      </div>
                      <div className="text-[8px] text-stone-400/80 truncate mt-0.5">
                        {spell.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
